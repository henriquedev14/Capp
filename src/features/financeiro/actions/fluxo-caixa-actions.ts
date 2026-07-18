"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

export async function atualizarSaldoCaixaAtual(
  valor: number
): Promise<{ erro?: string; ok?: boolean }> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (!Number.isFinite(valor)) return { erro: "Valor inválido." };

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    update: { saldoCaixaAtual: valor },
    create: { id: "default", saldoCaixaAtual: valor },
  });

  revalidatePath("/financeiro/fluxo-de-caixa");
  return { ok: true };
}
