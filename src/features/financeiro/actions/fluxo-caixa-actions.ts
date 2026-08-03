"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { temPermissao } from "@/infra/auth/exigir-permissao";

/**
 * Busca os dados brutos pro Fluxo de Caixa (contas a receber/pagar em
 * aberto + saldo atual + permissão de edição) — extraído da página em
 * 2.2.1 (item A4). A projeção em si (`projetarFluxoCaixa`) continua na
 * página, já que é lógica pura de cálculo, não busca de dado.
 */
export async function buscarDadosFluxoCaixa() {
  const [configuracao, contasReceber, contasPagar, podeEditar] = await Promise.all([
    prisma.configuracaoSistema.findUnique({ where: { id: "default" } }),
    prisma.contaReceber.findMany({
      where: {
        recebido: false,
        dataPrevista: { not: null },
        // Mesmo critério do dashboard: projeto arquivado (cancelado)
        // não deve mais contar na projeção futura.
        OR: [{ empreendimentoId: null }, { empreendimento: { excluidoEm: null } }],
      },
      select: { valor: true, dataPrevista: true },
    }),
    prisma.contaPagar.findMany({
      where: { pago: false },
      select: { valor: true, dataVencimento: true },
    }),
    temPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS),
  ]);

  return {
    saldoCaixaAtual: Number(configuracao?.saldoCaixaAtual ?? 0),
    contasReceber: contasReceber
      .filter((c): c is typeof c & { dataPrevista: Date } => c.dataPrevista !== null)
      .map((c) => ({ data: c.dataPrevista, valor: Number(c.valor) })),
    contasPagar: contasPagar.map((c) => ({ data: c.dataVencimento, valor: Number(c.valor) })),
    podeEditar,
  };
}

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
