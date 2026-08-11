"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

export interface PrecoFixoView {
  kit: string;
  valorUnitario: number;
  observacoes: string | null;
  definidoPorNome: string | null;
}

export async function listarPrecosFixosTipologia(tipologiaId: string): Promise<PrecoFixoView[]> {
  const registros = await prisma.precoFixoTipologia.findMany({
    where: { tipologiaId },
    include: { definidoPor: { select: { nome: true } } },
  });
  return registros.map((p) => ({
    kit: p.kit,
    valorUnitario: Number(p.valorUnitario),
    observacoes: p.observacoes,
    definidoPorNome: p.definidoPor?.nome ?? null,
  }));
}

export async function definirPrecoFixoTipologia(
  tipologiaId: string,
  kit: "ELETRICO" | "HIDRAULICO" | "QDC",
  valorUnitario: number,
  observacoes?: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.ORCAMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (valorUnitario <= 0) return { erro: "O valor precisa ser maior que zero." };

  const tipologia = await prisma.tipologia.findUnique({
    where: { id: tipologiaId },
    select: { empreendimentoId: true },
  });
  if (!tipologia) return { erro: "Tipologia não encontrada." };

  await prisma.precoFixoTipologia.upsert({
    where: { tipologiaId_kit: { tipologiaId, kit } },
    create: { tipologiaId, kit, valorUnitario, observacoes, definidoPorId: sessao.user.id },
    update: { valorUnitario, observacoes, definidoPorId: sessao.user.id },
  });

  revalidatePath(`/empreendimentos/${tipologia.empreendimentoId}/orcamento`);
  return { ok: true };
}

export async function removerPrecoFixoTipologia(
  tipologiaId: string,
  kit: "ELETRICO" | "HIDRAULICO" | "QDC"
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ORCAMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const tipologia = await prisma.tipologia.findUnique({
    where: { id: tipologiaId },
    select: { empreendimentoId: true },
  });

  await prisma.precoFixoTipologia.deleteMany({ where: { tipologiaId, kit } });

  if (tipologia) revalidatePath(`/empreendimentos/${tipologia.empreendimentoId}/orcamento`);
  return { ok: true };
}
