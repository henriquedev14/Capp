"use server";

import { revalidatePath } from "next/cache";
import { OrcamentacaoPrismaRepository } from "@/infra/db/prisma/repositories/orcamentacao-prisma-repository";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const repo = new OrcamentacaoPrismaRepository();

export async function atualizarPrecoBase(
  id: string,
  precoBase: number
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_PRECOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (isNaN(precoBase) || precoBase < 0) {
    return { erro: "Valor inválido." };
  }
  await repo.atualizarPrecoBase(id, precoBase);
  revalidatePath("/orcamentacao/precos");
  return { ok: true };
}

export async function atualizarFaixaPreco(
  id: string,
  areaMin: number,
  areaMax: number
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_PRECOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (!Number.isFinite(areaMin) || !Number.isFinite(areaMax) || areaMin < 0 || areaMax <= areaMin) {
    return { erro: "Faixa inválida — o valor máximo precisa ser maior que o mínimo." };
  }
  const { prisma } = await import("@/infra/db/prisma/client");
  await prisma.tabelaPrecoBase.update({ where: { id }, data: { areaMin, areaMax } });
  revalidatePath("/orcamentacao/precos");
  return { ok: true };
}

export async function atualizarFormulaKitPontos(dados: {
  valorMinimo: number;
  pontosInclusos: number;
  valorPorPontoExtra: number;
}): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_PRECOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (
    !Number.isFinite(dados.valorMinimo) ||
    dados.valorMinimo < 0 ||
    !Number.isInteger(dados.pontosInclusos) ||
    dados.pontosInclusos < 0 ||
    !Number.isFinite(dados.valorPorPontoExtra) ||
    dados.valorPorPontoExtra < 0
  ) {
    return { erro: "Valores inválidos." };
  }
  const { prisma } = await import("@/infra/db/prisma/client");
  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    update: {
      kitValorMinimo: dados.valorMinimo,
      kitPontosInclusos: dados.pontosInclusos,
      kitValorPorPontoExtra: dados.valorPorPontoExtra,
    },
    create: {
      id: "default",
      kitValorMinimo: dados.valorMinimo,
      kitPontosInclusos: dados.pontosInclusos,
      kitValorPorPontoExtra: dados.valorPorPontoExtra,
    },
  });
  revalidatePath("/orcamentacao/precos");
  return { ok: true };
}

export async function atualizarCriterioPrecificacao(
  criterio: "AREA" | "PONTOS_TETO"
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_PRECOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const { prisma } = await import("@/infra/db/prisma/client");
  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    update: { criterioPrecificacao: criterio },
    create: { id: "default", criterioPrecificacao: criterio },
  });
  revalidatePath("/orcamentacao/precos");
  return { ok: true };
}

export async function atualizarTierMultiplicador(
  id: string,
  multiplicador: number
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_PRECOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (isNaN(multiplicador) || multiplicador <= 0) {
    return { erro: "Multiplicador inválido." };
  }
  await repo.atualizarTierMultiplicador(id, { multiplicador });
  revalidatePath("/orcamentacao/precos");
  return { ok: true };
}
