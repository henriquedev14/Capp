"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

/**
 * Salva os 3 valores do critério "Livre" direto da tela de Orçamento
 * — pedido pelo Henrique em 11/08/2026 (o campo fica na tela de
 * Orçamento, não no cadastro geral do empreendimento).
 */
export async function salvarValoresLivre(
  empreendimentoId: string,
  eletrico: number | null,
  hidraulico: number | null,
  qdc: number | null
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ORCAMENTO_APLICAR_PRECO);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { precoFixoEletrico: eletrico, precoFixoHidraulico: hidraulico, precoFixoQdc: qdc },
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true };
}
