"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const TAMANHO_MAXIMO_BYTES = 50 * 1024 * 1024; // 50MB

interface Resultado {
  erro?: string;
  ok?: boolean;
}

export async function uploadBoletoContaPagar(contaId: string, formData: FormData): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) return { erro: "Selecione um arquivo." };
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { erro: `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)}MB). Limite: 50MB.` };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  await prisma.contaPagar.update({
    where: { id: contaId },
    data: {
      boletoNome: arquivo.name,
      boletoConteudo: new Uint8Array(buffer),
      boletoTamanho: arquivo.size,
      boletoTipo: arquivo.type || null,
    },
  });

  revalidatePath("/financeiro/contas-pagar");
  return { ok: true };
}

export async function removerBoletoContaPagar(contaId: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  await prisma.contaPagar.update({
    where: { id: contaId },
    data: { boletoNome: null, boletoConteudo: null, boletoTamanho: null, boletoTipo: null },
  });

  revalidatePath("/financeiro/contas-pagar");
  return { ok: true };
}

export async function uploadBoletoContaReceber(contaId: string, formData: FormData): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) return { erro: "Selecione um arquivo." };
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { erro: `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)}MB). Limite: 50MB.` };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  await prisma.contaReceber.update({
    where: { id: contaId },
    data: {
      boletoNome: arquivo.name,
      boletoConteudo: new Uint8Array(buffer),
      boletoTamanho: arquivo.size,
      boletoTipo: arquivo.type || null,
    },
  });

  revalidatePath("/financeiro/contas-receber");
  return { ok: true };
}

export async function removerBoletoContaReceber(contaId: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  await prisma.contaReceber.update({
    where: { id: contaId },
    data: { boletoNome: null, boletoConteudo: null, boletoTamanho: null, boletoTipo: null },
  });

  revalidatePath("/financeiro/contas-receber");
  return { ok: true };
}
