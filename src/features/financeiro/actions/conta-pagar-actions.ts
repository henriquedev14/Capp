"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

interface Resultado {
  erro?: string;
  ok?: boolean;
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
  primeiroVencimento: string; // ISO date — demais parcelas somam 1 mês cada
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

  for (let i = 0; i < dados.totalParcelas; i++) {
    const vencimento = new Date(dataBase);
    vencimento.setMonth(vencimento.getMonth() + i);

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
