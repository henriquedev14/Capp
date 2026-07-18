"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { importarTabelaPrecoPadrao } from "@/features/fornecedores/lib/importar-tabela-preco-padrao";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

/**
 * Lê a planilha e valida os códigos internos SEM salvar nada — usada pela
 * tela pra montar a pré-visualização e a lista de inconsistências antes
 * do usuário confirmar a importação.
 */
export async function validarPlanilhaTabelaPreco(
  formData: FormData
): Promise<
  | { erro: string }
  | {
      ok: true;
      linhas: {
        codigoInterno: string;
        descricao: string;
        unidade: string;
        valorUnitario: number;
        marca: string;
        prazoEntrega: string;
        observacoes: string;
        materialEletricoId: string | null;
        materialEletricoNome: string | null;
      }[];
      avisos: string[];
      totalInconsistencias: number;
    }
> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  const arquivo = formData.get("arquivo");
  if (!arquivo || !(arquivo instanceof File)) {
    return { erro: "Nenhum arquivo enviado." };
  }
  const nomeArquivo = arquivo.name.toLowerCase();
  if (!nomeArquivo.endsWith(".xlsx")) {
    return { erro: "Formato inválido. Envie um arquivo .xlsx." };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const { linhas, avisos } = importarTabelaPrecoPadrao(buffer);
  if (linhas.length === 0) {
    return { erro: avisos[0] ?? "Não encontrei nenhum material pra importar nesta planilha." };
  }

  const catalogo = await prisma.materialEletrico.findMany({
    where: { codigo: { in: linhas.map((l) => l.codigoInterno) } },
    select: { id: true, codigo: true, nome: true },
  });
  const porCodigo = new Map(catalogo.filter((m) => m.codigo).map((m) => [m.codigo as string, m]));

  const linhasComMatch = linhas.map((l) => {
    const material = porCodigo.get(l.codigoInterno);
    return {
      ...l,
      materialEletricoId: material?.id ?? null,
      materialEletricoNome: material?.nome ?? null,
    };
  });

  const totalInconsistencias = linhasComMatch.filter((l) => !l.materialEletricoId).length;

  return { ok: true, linhas: linhasComMatch, avisos, totalInconsistencias };
}

/**
 * Confirma a importação — só chega aqui depois que a pré-visualização já
 * rodou e o usuário confirmou. Bloqueia de novo por segurança se ainda
 * houver alguma linha sem material (nunca confia só na checagem do
 * front-end).
 */
export async function importarTabelaPreco(input: {
  fornecedorId: string;
  nome: string;
  vigenciaInicio: string; // ISO
  vigenciaFim: string; // ISO
  status: "ATIVA" | "EXPIRADA" | "FUTURA";
  observacoes?: string;
  linhas: {
    codigoInterno: string;
    descricao: string;
    unidade: string;
    valorUnitario: number;
    marca: string;
    prazoEntrega: string;
    observacoes: string;
    materialEletricoId: string | null;
  }[];
}): Promise<Resultado & { tabelaId?: string }> {
  const sessao = await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  if (!input.nome.trim()) return { erro: "Dê um nome pra essa tabela (ex: Julho/2026)." };
  if (!input.vigenciaInicio || !input.vigenciaFim) {
    return { erro: "Informe a vigência inicial e final." };
  }
  if (input.linhas.length === 0) return { erro: "Nenhuma linha pra importar." };

  const semMatch = input.linhas.filter((l) => !l.materialEletricoId);
  if (semMatch.length > 0) {
    return {
      erro: `${semMatch.length} material(is) ainda sem código encontrado no catálogo — corrija antes de importar: ${semMatch
        .slice(0, 5)
        .map((l) => l.codigoInterno)
        .join(", ")}${semMatch.length > 5 ? "..." : ""}`,
    };
  }

  const tabela = await prisma.tabelaPrecoFornecedor.create({
    data: {
      fornecedorId: input.fornecedorId,
      nome: input.nome.trim(),
      vigenciaInicio: new Date(input.vigenciaInicio),
      vigenciaFim: new Date(input.vigenciaFim),
      usuarioImportacaoId: sessao.user.id,
      status: input.status,
      observacoes: input.observacoes?.trim() || null,
      itens: {
        create: input.linhas.map((l) => ({
          materialEletricoId: l.materialEletricoId,
          descricao: l.descricao,
          unidade: l.unidade,
          valorUnitario: l.valorUnitario,
          marca: l.marca,
          prazoEntrega: l.prazoEntrega || null,
          observacoes: l.observacoes || null,
        })),
      },
    },
  });

  revalidatePath(`/fornecedores/${input.fornecedorId}`);
  return { ok: true, tabelaId: tabela.id };
}

export async function listarTabelasPreco(fornecedorId: string) {
  await exigirPermissao(PERMISSOES.FORNECEDOR_VER);
  const tabelas = await prisma.tabelaPrecoFornecedor.findMany({
    where: { fornecedorId },
    include: {
      usuarioImportacao: { select: { nome: true } },
      _count: { select: { itens: true } },
    },
    orderBy: { dataImportacao: "desc" },
  });
  return tabelas.map((t) => ({
    id: t.id,
    nome: t.nome,
    vigenciaInicio: t.vigenciaInicio.toISOString(),
    vigenciaFim: t.vigenciaFim.toISOString(),
    dataImportacao: t.dataImportacao.toISOString(),
    usuarioImportacaoNome: t.usuarioImportacao.nome,
    status: t.status,
    observacoes: t.observacoes,
    totalItens: t._count.itens,
  }));
}

export async function buscarTabelaPrecoComItens(tabelaId: string) {
  await exigirPermissao(PERMISSOES.FORNECEDOR_VER);
  const tabela = await prisma.tabelaPrecoFornecedor.findUnique({
    where: { id: tabelaId },
    include: {
      usuarioImportacao: { select: { nome: true } },
      itens: { orderBy: { descricao: "asc" } },
    },
  });
  if (!tabela) return null;
  return {
    id: tabela.id,
    nome: tabela.nome,
    vigenciaInicio: tabela.vigenciaInicio.toISOString(),
    vigenciaFim: tabela.vigenciaFim.toISOString(),
    dataImportacao: tabela.dataImportacao.toISOString(),
    usuarioImportacaoNome: tabela.usuarioImportacao.nome,
    status: tabela.status,
    observacoes: tabela.observacoes,
    totalItens: tabela.itens.length,
    itens: tabela.itens.map((i) => ({
      id: i.id,
      descricao: i.descricao,
      unidade: i.unidade,
      valorUnitario: Number(i.valorUnitario),
      marca: i.marca,
      prazoEntrega: i.prazoEntrega,
      observacoes: i.observacoes,
    })),
  };
}

/**
 * Exclui uma tabela inteira — só pra corrigir um erro de importação
 * (arquivo errado, fornecedor errado). Não é o fluxo normal — o normal é
 * sempre IMPORTAR DE NOVO (nova tabela), nunca apagar a antiga.
 */
export async function excluirTabelaPreco(tabelaId: string, fornecedorId: string): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);
  await prisma.tabelaPrecoFornecedor.delete({ where: { id: tabelaId } });
  revalidatePath(`/fornecedores/${fornecedorId}`);
  return { ok: true };
}

export async function atualizarStatusTabelaPreco(
  tabelaId: string,
  fornecedorId: string,
  status: "ATIVA" | "EXPIRADA" | "FUTURA"
): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);
  await prisma.tabelaPrecoFornecedor.update({ where: { id: tabelaId }, data: { status } });
  revalidatePath(`/fornecedores/${fornecedorId}`);
  return { ok: true };
}
