"use server";

import { revalidatePath } from "next/cache";
import { LevantamentoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-prisma-repository";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { CircuitoPeca } from "@/core/empreendimentos/entities/levantamento-eletrico";
import { ehDiretorOuCoordenador } from "@/infra/auth/eh-diretor-ou-coordenador";
import { prisma } from "@/infra/db/prisma/client";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

const timelineRepo = new TimelinePrismaRepository();

const repo = new LevantamentoPrismaRepository();

function revalidar(empreendimentoId: string) {
  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  revalidatePath(`/empreendimentos/${empreendimentoId}/levantamento`);
}

// ── Levantamento ─────────────────────────────────────────────────────────────

export async function abrirOuCriarLevantamento(
  empreendimentoId: string,
  tipologiaId: string
): Promise<{ id: string } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    const lev = await repo.criarOuBuscar(empreendimentoId, tipologiaId, sessao.user.id);
    return { id: lev.id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao abrir levantamento." };
  }
}

// ── Peças ────────────────────────────────────────────────────────────────────

export async function adicionarPeca(
  empreendimentoId: string,
  levantamentoId: string,
  data: {
    numero: number;
    kit: "LAJE" | "VERTICAL" | "PISO";
    local?: string;
    trecho: string;
    obs?: string;
    vertical1?: number;
    laje1?: number;
    horiz?: number;
    laje2?: number;
    vertical2?: number;
    diametro?: string;
    sobra?: number;
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
    const peca = await repo.adicionarPeca(levantamentoId, data);
    revalidar(empreendimentoId);
    return { id: peca.id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao adicionar peça." };
  }
}

export async function atualizarPeca(
  empreendimentoId: string,
  pecaId: string,
  data: Parameters<typeof repo.atualizarPeca>[1]
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.atualizarPeca(pecaId, data);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao atualizar peça." };
  }
}

export async function excluirPeca(
  empreendimentoId: string,
  pecaId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.excluirPeca(pecaId);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao excluir peça." };
  }
}

// ── Circuitos da peça ────────────────────────────────────────────────────────

export async function adicionarCircuito(
  empreendimentoId: string,
  pecaId: string,
  data: Omit<CircuitoPeca, "id" | "pecaId" | "createdAt" | "updatedAt">
): Promise<{ id: string } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    const circ = await repo.adicionarCircuito(pecaId, data);
    revalidar(empreendimentoId);
    return { id: circ.id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao adicionar circuito." };
  }
}

export async function atualizarCircuito(
  empreendimentoId: string,
  circuitoId: string,
  data: Parameters<typeof repo.atualizarCircuito>[1]
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.atualizarCircuito(circuitoId, data);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao atualizar circuito." };
  }
}

export async function excluirCircuito(
  empreendimentoId: string,
  circuitoId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.excluirCircuito(circuitoId);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao excluir circuito." };
  }
}

// ── Catálogo ─────────────────────────────────────────────────────────────────

export async function buscarCatalogo(empreendimentoId: string) {
  return repo.buscarCatalogo(empreendimentoId);
}

// ── Import de planilha ───────────────────────────────────────────────────────

export async function importarPlanilha(
  empreendimentoId: string,
  tipologiaId: string,
  formData: FormData
): Promise<{ ok: true; totalPecas: number; avisos: string[] } | { erro: string }> {
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

  try {
    const [{ importarPlanilhaLevantamento }, { importarPlanilhaParametros, ehFormatoParametros }, XLSX] =
      await Promise.all([
        import("@/features/levantamento/lib/importar-planilha"),
        import("@/features/levantamento/lib/importar-planilha-parametros"),
        import("xlsx"),
      ]);

    const buffer = Buffer.from(await arquivo.arrayBuffer());

    // Detecta automaticamente o formato: planilhas mais novas trazem os
    // dados estruturados em abas (PARAMETROS/DISPOSITIVOS/CIRCUITOS_QDC);
    // as antigas trazem tudo numa única tabela visual com "PEÇA 01", "PEÇA
    // 02"... Os dois formatos continuam aceitos, sem precisar escolher.
    const wbProbe = XLSX.read(buffer, { type: "buffer" });
    const resultado = ehFormatoParametros(wbProbe)
      ? importarPlanilhaParametros(buffer)
      : importarPlanilhaLevantamento(buffer);

    if (resultado.pecas.length === 0) {
      return { erro: resultado.avisos.join(" ") || "Nenhuma peça encontrada na planilha." };
    }

    // Cria (ou reutiliza) o levantamento da tipologia
    const levantamento = await repo.criarOuBuscar(empreendimentoId, tipologiaId, sessao.user.id);

    // Se já foi validado pelo gestor, reimportar (que substitui tudo) só
    // pode com autorização de Diretor ou Coordenador — evita que alguém
    // sobrescreva sem querer um levantamento já aprovado, que pode já ter
    // orçamento/proposta gerados em cima dele.
    if (levantamento.status === "VALIDADO" && !(await ehDiretorOuCoordenador())) {
      return {
        erro:
          "Este levantamento já foi validado pelo gestor. Reimportar a planilha por cima exige autorização de Diretor ou Coordenador.",
      };
    }

    // Substitui as peças existentes pelas importadas
    for (const pecaExistente of levantamento.pecas) {
      await repo.excluirPeca(pecaExistente.id);
    }

    // Totais oficiais da planilha (quando ela já traz uma tabela
    // consolidada própria) — guarda pra usar depois nas sugestões de
    // material, em vez de recalcular a partir das peças.
    await prisma.levantamentoEletrico.update({
      where: { id: levantamento.id },
      data: {
        totaisImportadosJson: resultado.totaisOficiais ? JSON.stringify(resultado.totaisOficiais) : null,
      },
    });

    for (const p of resultado.pecas) {
      const peca = await repo.adicionarPeca(levantamento.id, {
        numero: p.numero,
        kit: p.kit,
        local: p.local ?? undefined,
        trecho: p.trecho,
        vertical1: p.vertical1,
        laje1: p.laje1,
        // Se a planilha usa o campo ELETRO direto (sem decompor as medidas),
        // guarda o valor no campo horiz para o cálculo bater
        horiz: p.horiz > 0 ? p.horiz : p.eletro,
        laje2: p.laje2,
        vertical2: p.vertical2,
        diametro: p.diametro,
        sobra: p.sobra,
      });

      for (const c of p.circuitos) {
        await repo.adicionarCircuito(peca.id, {
          catalogoId: null,
          bitola: c.bitola,
          circuito: c.circuito,
          temVermelho: c.temVermelho,
          temPreto: c.temPreto,
          temAzul: c.temAzul,
          temVerde: c.temVerde,
          temAmarelo: c.temAmarelo,
          temBranco: c.temBranco,
          temCinza: c.temCinza ?? false,
          identRetorno: c.identRetorno,
          ehParalelo: c.ehParalelo,
          ehRetorno: c.ehRetorno,
          sobraOverride: c.sobraOverride ?? null,
          horizOverride: c.horizOverride ?? null,
        });
      }
    }

    revalidar(empreendimentoId);

    // Log de inserção — registra na timeline do empreendimento quem
    // importou o levantamento e quando.
    await timelineRepo.criarEvento({
      empreendimentoId,
      tipo: "DOCUMENTO",
      titulo: "Levantamento Elétrico importado",
      descricao: `${resultado.pecas.length} peças importadas de "${arquivo.name}".`,
      usuarioId: sessao.user.id,
    });

    return { ok: true, totalPecas: resultado.pecas.length, avisos: resultado.avisos };
  } catch (e) {
    return {
      erro: e instanceof Error ? `Erro ao processar planilha: ${e.message}` : "Erro ao importar.",
    };
  }
}

// ── Validação ────────────────────────────────────────────────────────────────

export async function validarLevantamento(
  empreendimentoId: string,
  levantamentoId: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.validarLevantamento(levantamentoId);
    await timelineRepo.criarEvento({
      empreendimentoId,
      tipo: "DOCUMENTO",
      titulo: "Levantamento Elétrico validado",
      descricao: "Levantamento confirmado — pronto para orçamentação.",
      usuarioId: sessao.user.id,
    });
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao validar." };
  }
}

export async function voltarParaRascunho(
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

  const atual = await prisma.levantamentoEletrico.findUnique({
    where: { id: levantamentoId },
    select: { status: true },
  });
  if (atual?.status === "VALIDADO" && !(await ehDiretorOuCoordenador())) {
    return {
      erro: "Este levantamento já foi validado pelo gestor. Voltar pra rascunho exige autorização de Diretor ou Coordenador.",
    };
  }

  try {
    await repo.voltarParaRascunho(levantamentoId);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao reverter." };
  }
}

/**
 * Exclui o Levantamento Elétrico inteiro (todas as peças e circuitos vão
 * junto, por cascade) — volta a tipologia pro estado "sem levantamento",
 * como se nunca tivesse sido iniciado. Mesma trava de segurança que
 * voltarParaRascunho: se já foi validado, só Diretor/Coordenador pode.
 */
export async function excluirLevantamentoEletrico(
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

  const atual = await prisma.levantamentoEletrico.findUnique({
    where: { id: levantamentoId },
    select: { status: true, tipologiaId: true },
  });
  if (!atual) return { erro: "Levantamento não encontrado." };
  if (atual.status === "VALIDADO" && !(await ehDiretorOuCoordenador())) {
    return {
      erro: "Este levantamento já foi validado pelo gestor. Excluir exige autorização de Diretor ou Coordenador.",
    };
  }

  try {
    await prisma.levantamentoEletrico.delete({ where: { id: levantamentoId } });
    // BUG REAL corrigido: excluir o Levantamento Elétrico deixava o
    // Levantamento de Materiais daquela mesma tipologia órfão — ele foi
    // gerado A PARTIR do elétrico (quantitativo de material vem dos
    // circuitos), então sem o elétrico o material não tem mais base
    // nenhuma. Precisa espelhar a exclusão, não deixar pra trás.
    await prisma.levantamentoMateriais.deleteMany({
      where: { tipologiaId: atual.tipologiaId, empreendimentoId },
    });
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao excluir o levantamento." };
  }
}
