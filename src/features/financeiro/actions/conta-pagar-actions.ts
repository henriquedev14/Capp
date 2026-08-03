"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

/**
 * Lista empresas, categorias, contas pendentes e total já pago no mês —
 * extraído da página em 2.2.1 (item A4).
 */
export async function listarDadosContasAPagar() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

  const [empresas, categorias, contasRaw, agregadoPagasMes] = await Promise.all([
    prisma.empresaGrupo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.categoriaDespesa.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.contaPagar.findMany({
      where: { pago: false },
      include: { empresa: true, categoria: true },
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.contaPagar.aggregate({
      where: { pago: true, pagoEm: { gte: inicioMes, lte: fimMes } },
      _sum: { valor: true },
    }),
  ]);

  const contas = contasRaw.map((c) => ({
    id: c.id,
    descricao: c.descricao,
    tipo: c.tipo,
    valor: Number(c.valor),
    dataVencimento: c.dataVencimento.toISOString(),
    pago: c.pago,
    parcelaAtual: c.parcelaAtual,
    parcelaTotal: c.parcelaTotal,
    empresaNome: c.empresa.nome,
    categoriaNome: c.categoria.nome,
  }));

  return { empresas, categorias, contas, totalPagoEsteMes: Number(agregadoPagasMes._sum.valor ?? 0) };
}

/**
 * Lista o histórico de contas já pagas — extraído da página em 2.2.1
 * (item A4). Mantém o mesmo formato "achatado" (datas em string ISO,
 * nomes em vez de objetos relacionados) que a página já esperava.
 */
export async function listarContasPagas() {
  const contasRaw = await prisma.contaPagar.findMany({
    where: { pago: true },
    include: { empresa: true, categoria: true },
    orderBy: { dataVencimento: "desc" },
  });

  return contasRaw.map((c) => ({
    id: c.id,
    descricao: c.descricao,
    tipo: c.tipo,
    valor: Number(c.valor),
    dataVencimento: c.dataVencimento.toISOString(),
    pagoEm: c.pagoEm ? c.pagoEm.toISOString() : null,
    parcelaAtual: c.parcelaAtual,
    parcelaTotal: c.parcelaTotal,
    empresaNome: c.empresa.nome,
    categoriaNome: c.categoria.nome,
  }));
}

export interface DadosContaAvulsa {
  empresaId: string;
  categoriaId: string;
  descricao: string;
  valor: number;
  dataVencimento: string; // ISO date (yyyy-mm-dd)
  observacoes?: string;
}

export async function criarContaAvulsa(dados: DadosContaAvulsa): Promise<Resultado> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!dados.descricao.trim()) return { erro: "Descrição é obrigatória." };
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) return { erro: "Valor inválido." };
  const data = new Date(dados.dataVencimento);
  if (isNaN(data.getTime())) return { erro: "Data de vencimento inválida." };

  await prisma.contaPagar.create({
    data: {
      empresaId: dados.empresaId,
      categoriaId: dados.categoriaId,
      descricao: dados.descricao.trim(),
      tipo: "AVULSA",
      valor: dados.valor,
      dataVencimento: data,
      observacoes: dados.observacoes?.trim() || null,
      criadoPorId: sessao.user.id,
    },
  });

  revalidatePath("/financeiro");
  return { ok: true };
}

export interface DadosParcelamento {
  empresaId: string;
  categoriaId: string;
  descricao: string;
  valorParcela: number;
  totalParcelas: number;
  primeiroVencimento: string; // ISO date — demais parcelas somam intervaloDias cada
  // Dias entre uma parcela e a próxima — pedido pelo Henrique em
  // 28/07/2026 (antes era sempre "+1 mês", fixo). Padrão 30 (mensal),
  // mas aceita qualquer número (7 = semanal, 15 = quinzenal, etc).
  intervaloDias?: number;
  observacoes?: string;
}

/**
 * Cria de uma vez TODAS as parcelas de um parcelamento (ex: cartão em
 * 36x) — cada parcela vira uma ContaPagar própria, com o vencimento
 * incrementando 1 mês a partir da primeira.
 */
export async function criarParcelamento(dados: DadosParcelamento): Promise<Resultado & { criadas?: number }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!dados.descricao.trim()) return { erro: "Descrição é obrigatória." };
  if (!Number.isFinite(dados.valorParcela) || dados.valorParcela <= 0) return { erro: "Valor da parcela inválido." };
  if (!Number.isInteger(dados.totalParcelas) || dados.totalParcelas < 1 || dados.totalParcelas > 120) {
    return { erro: "Número de parcelas inválido." };
  }
  const dataBase = new Date(dados.primeiroVencimento);
  if (isNaN(dataBase.getTime())) return { erro: "Data do primeiro vencimento inválida." };

  const intervaloDias = dados.intervaloDias && dados.intervaloDias > 0 ? dados.intervaloDias : 30;

  for (let i = 0; i < dados.totalParcelas; i++) {
    const vencimento = new Date(dataBase);
    vencimento.setDate(vencimento.getDate() + i * intervaloDias);

    await prisma.contaPagar.create({
      data: {
        empresaId: dados.empresaId,
        categoriaId: dados.categoriaId,
        descricao: dados.descricao.trim(),
        tipo: "PARCELADA",
        valor: dados.valorParcela,
        dataVencimento: vencimento,
        parcelaAtual: i + 1,
        parcelaTotal: dados.totalParcelas,
        observacoes: dados.observacoes?.trim() || null,
        criadoPorId: sessao.user.id,
      },
    });
  }

  revalidatePath("/financeiro");
  return { ok: true, criadas: dados.totalParcelas };
}

export async function marcarContaComoPaga(id: string): Promise<Resultado> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.FINANCEIRO_BAIXAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  await prisma.contaPagar.update({
    where: { id },
    data: { pago: true, pagoEm: new Date(), pagoPorId: sessao.user.id },
  });

  revalidatePath("/financeiro");
  return { ok: true };
}

export async function desfazerPagamentoConta(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_BAIXAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  await prisma.contaPagar.update({
    where: { id },
    data: { pago: false, pagoEm: null, pagoPorId: null },
  });

  revalidatePath("/financeiro");
  return { ok: true };
}

export interface DadosEdicaoContaPagar {
  descricao?: string;
  valor?: number;
  dataVencimento?: string; // ISO date
  categoriaId?: string;
  empresaId?: string;
  observacoes?: string;
}

export async function editarContaPagar(
  id: string,
  dados: DadosEdicaoContaPagar
): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const data: Record<string, unknown> = {};
  if (dados.descricao !== undefined) {
    if (!dados.descricao.trim()) return { erro: "Descrição não pode ficar vazia." };
    data.descricao = dados.descricao.trim();
  }
  if (dados.valor !== undefined) {
    if (!Number.isFinite(dados.valor) || dados.valor <= 0) return { erro: "Valor inválido." };
    data.valor = dados.valor;
  }
  if (dados.dataVencimento !== undefined) {
    const d = new Date(dados.dataVencimento);
    if (isNaN(d.getTime())) return { erro: "Data inválida." };
    data.dataVencimento = d;
  }
  if (dados.categoriaId !== undefined) data.categoriaId = dados.categoriaId;
  if (dados.empresaId !== undefined) data.empresaId = dados.empresaId;
  if (dados.observacoes !== undefined) data.observacoes = dados.observacoes.trim() || null;

  await prisma.contaPagar.update({ where: { id }, data });
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function excluirContaPagar(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_EXCLUIR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  await prisma.contaPagar.delete({ where: { id } });
  revalidatePath("/financeiro");
  return { ok: true };
}
