"use server";

import { revalidatePath } from "next/cache";
import { LevantamentoMateriaisPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-materiais-prisma-repository";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { prisma } from "@/infra/db/prisma/client";
import { ehDiretorOuCoordenador } from "@/infra/auth/eh-diretor-ou-coordenador";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";
import { importarPlanilhaMateriais } from "@/features/orcamentacao/lib/importar-planilha-materiais";

const repo = new LevantamentoMateriaisPrismaRepository();
const timelineRepo = new TimelinePrismaRepository();

function revalidar(empreendimentoId: string) {
  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  revalidatePath(`/empreendimentos/${empreendimentoId}/levantamento-materiais`);
}

export async function adicionarItemMaterial(
  empreendimentoId: string,
  levantamentoId: string,
  data: {
    materialCatalogoId?: string | null;
    fabricante: string;
    categoria?: string | null;
    descricao: string;
    unidade: string;
    precoUnitario: number;
    quantidade: number;
    quantidadeUnitaria?: number | null;
    repeticoes?: number | null;
  }
): Promise<{ id: string } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    // Evita duplicar linha quando o mesmo material é adicionado de novo —
    // se já existe um item com a MESMA descrição neste levantamento,
    // atualiza a quantidade em vez de criar outra linha.
    const existente = await prisma.itemLevantamentoMaterial.findFirst({
      where: { levantamentoId, descricao: data.descricao },
      select: { id: true },
    });

    const item = existente
      ? await prisma.itemLevantamentoMaterial.update({
          where: { id: existente.id },
          data: {
            materialEletricoId: data.materialCatalogoId ?? null,
            fabricante: data.fabricante,
            categoria: data.categoria ?? null,
            unidade: data.unidade,
            precoUnitario: data.precoUnitario,
            quantidade: data.quantidade,
            quantidadeUnitaria: data.quantidadeUnitaria ?? null,
            repeticoes: data.repeticoes ?? null,
          },
        })
      : await repo.adicionarItem(levantamentoId, {
          materialCatalogoId: data.materialCatalogoId ?? null,
          fabricante: data.fabricante,
          categoria: data.categoria ?? null,
          descricao: data.descricao,
          unidade: data.unidade,
          precoUnitario: data.precoUnitario,
          quantidade: data.quantidade,
          quantidadeUnitaria: data.quantidadeUnitaria ?? null,
          repeticoes: data.repeticoes ?? null,
        });
    revalidar(empreendimentoId);
    return { id: item.id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao adicionar item." };
  }
}

export async function excluirItemMaterial(
  empreendimentoId: string,
  itemId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.excluirItem(itemId);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao excluir item." };
  }
}

export async function validarLevantamentoMateriais(
  empreendimentoId: string,
  levantamentoId: string,
  tipologiaNome: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    // Mesma regra do PEX/hidráulico: só gestor valida, porque os números
    // vão direto pro Bloco 2 do orçamento.
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_APROVAR_PROPOSTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado — só um Diretor ou Coordenador pode validar este levantamento." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.validar(levantamentoId);
    await timelineRepo.criarEvento({
      empreendimentoId,
      tipo: "DOCUMENTO",
      titulo: "Levantamento de Materiais validado",
      descricao: `Tipologia: ${tipologiaNome}`,
      usuarioId: sessao.user.id,
    });
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao validar." };
  }
}

export async function voltarParaRascunhoMateriais(
  empreendimentoId: string,
  levantamentoId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.voltarParaRascunho(levantamentoId);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao reverter." };
  }
}

// ============================================================================
// UPLOAD da planilha de materiais — lê a aba MATERIAL e substitui os itens
// da tipologia. Casamento com o catálogo é por CODIGO (não por texto da
// descrição) — elimina o risco de falso-match que a sugestão automática
// antiga tinha.
// ============================================================================

export interface ResultadoUploadMateriais {
  ok: true;
  levantamentoId: string;
  totalItens: number;
  vinculados: number;
  codigosNaoEncontrados: string[];
  avisos: string[];
}

export async function uploadMateriaisTipologia(
  empreendimentoId: string,
  tipologiaId: string,
  formData: FormData
): Promise<ResultadoUploadMateriais | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  const arquivo = formData.get("arquivo");
  if (!arquivo || !(arquivo instanceof File)) {
    return { erro: "Nenhum arquivo enviado." };
  }
  const nomeArquivo = arquivo.name.toLowerCase();
  if (!nomeArquivo.endsWith(".xlsx") && !nomeArquivo.endsWith(".xlsm") && !nomeArquivo.endsWith(".xltx")) {
    return { erro: "Formato inválido. Envie um arquivo .xlsx, .xlsm ou .xltx." };
  }

  // Levantamento já validado não pode ser sobrescrito por upload — precisa
  // reverter pra rascunho antes (mesma regra do resto da tela).
  const existente = await repo.buscar(empreendimentoId, tipologiaId);
  if (existente?.status === "VALIDADO") {
    return { erro: "Este levantamento já foi validado. Reverta para rascunho antes de subir uma nova planilha." };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const { linhas, avisos } = importarPlanilhaMateriais(buffer);
  if (linhas.length === 0) {
    return { erro: avisos[0] ?? "Não encontrei nenhum material pra importar nesta planilha." };
  }

  const catalogo = await repo.buscarPorCodigos(linhas.map((l) => l.codigo));

  const codigosNaoEncontrados: string[] = [];
  const itensParaSalvar = linhas.map((l) => {
    const doCatalogo = catalogo.get(l.codigo);
    if (!doCatalogo) codigosNaoEncontrados.push(l.codigo);
    return {
      materialCatalogoId: doCatalogo?.id ?? null,
      fabricante: doCatalogo?.fabricante ?? "Genérico",
      categoria: l.categoria || doCatalogo?.categoria || null,
      descricao: l.descricao,
      unidade: l.unidadeConsumo,
      precoUnitario: doCatalogo?.precoUnitario ?? 0,
      quantidade: l.quantidadeTotal,
      quantidadeUnitaria: l.quantidadeUnitaria,
      repeticoes: l.repeticoes,
    };
  });

  const lev = await repo.criarOuBuscar(empreendimentoId, tipologiaId, sessao.user.id);
  await repo.substituirItensPorUpload(lev.id, itensParaSalvar);

  const todosAvisos = [...avisos];
  if (codigosNaoEncontrados.length > 0) {
    todosAvisos.push(
      `${codigosNaoEncontrados.length} código(s) sem correspondência no catálogo: ${codigosNaoEncontrados.join(", ")}.`
    );
  }

  await timelineRepo.criarEvento({
    empreendimentoId,
    tipo: "DOCUMENTO",
    titulo: "Materiais importados via planilha",
    descricao: `${itensParaSalvar.length} materiais importados de "${arquivo.name}" para a tipologia.`,
    usuarioId: sessao.user.id,
  });

  revalidar(empreendimentoId);
  return {
    ok: true,
    levantamentoId: lev.id,
    totalItens: itensParaSalvar.length,
    vinculados: itensParaSalvar.length - codigosNaoEncontrados.length,
    codigosNaoEncontrados,
    avisos: todosAvisos,
  };
}

/**
 * Apaga TODOS os itens do Levantamento de Materiais de uma tipologia de
 * uma vez — pra saneamento manual quando o levantamento acumulou lixo de
 * testes repetidos (útil enquanto o upsert por descrição em
 * adicionarItemMaterial ainda não existia pra evitar isso daqui pra frente).
 */
export async function limparTodosItensMaterial(
  empreendimentoId: string,
  levantamentoId: string
): Promise<{ ok: true; quantidade: number } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    const resultado = await prisma.itemLevantamentoMaterial.deleteMany({
      where: { levantamentoId },
    });
    revalidar(empreendimentoId);
    return { ok: true, quantidade: resultado.count };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao limpar itens." };
  }
}

/**
 * Exclui o Levantamento de Materiais inteiro (o registro em si, não só os
 * itens) — a tipologia volta pro estado "sem levantamento de materiais",
 * como se nunca tivesse sido iniciado. Itens somem junto por cascade.
 */
export async function excluirLevantamentoMateriaisCompleto(
  empreendimentoId: string,
  levantamentoId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  const atual = await prisma.levantamentoMateriais.findUnique({
    where: { id: levantamentoId },
    select: { status: true },
  });
  if (!atual) return { erro: "Levantamento de materiais não encontrado." };
  if (atual.status === "VALIDADO" && !(await ehDiretorOuCoordenador())) {
    return {
      erro: "Este levantamento já foi validado pelo gestor. Excluir exige autorização de Diretor ou Coordenador.",
    };
  }

  try {
    await prisma.levantamentoMateriais.delete({ where: { id: levantamentoId } });
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao excluir o levantamento de materiais." };
  }
}
