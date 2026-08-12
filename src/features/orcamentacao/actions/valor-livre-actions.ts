"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

/**
 * Salva os valores de serviço por kit e recalcula os itens do orçamento.
 *
 * Desde 12/08/2026 este é o ÚNICO jeito de dar preço ao serviço HGI.
 * Decisão do Henrique: "o preço é sempre negociado antes", então
 * calcular por faixa de área ou fórmula de pontos de teto era teatro —
 * o número sempre acabava sendo sobrescrito na negociação.
 *
 * Conta: valor do kit × total de unidades do empreendimento.
 * Sem multiplicador de tier, sem faixa de área, sem pontos de teto, e
 * sem depender de levantamento validado.
 */
export async function salvarValoresServico(
  empreendimentoId: string,
  orcamentoId: string | null,
  eletrico: number | null,
  hidraulico: number | null,
  qdc: number | null
): Promise<{ ok: true; totalCalculado: number } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ORCAMENTO_APLICAR_PRECO);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: { kitEletrico: true, kitHidraulico: true, kitQdc: true },
  });
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };

  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { precoFixoEletrico: eletrico, precoFixoHidraulico: hidraulico, precoFixoQdc: qdc },
  });

  let totalCalculado = 0;

  if (orcamentoId) {
    const tipologias = await prisma.tipologia.findMany({
      where: { empreendimentoId },
      select: { quantidadeUnidades: true },
    });
    const totalUnidades = tipologias.reduce((s, t) => s + t.quantidadeUnidades, 0);

    const kits: Array<{ kit: string; contratado: boolean; valor: number | null }> = [
      { kit: "ELETRICO", contratado: empreendimento.kitEletrico, valor: eletrico },
      { kit: "HIDRAULICO", contratado: empreendimento.kitHidraulico, valor: hidraulico },
      { kit: "QDC", contratado: empreendimento.kitQdc, valor: qdc },
    ];

    const novosItens = kits
      .filter((k) => k.contratado && k.valor != null && k.valor > 0)
      .map((k) => {
        const total = parseFloat((k.valor! * totalUnidades).toFixed(2));
        totalCalculado += total;
        return {
          orcamentoId,
          tipologiaId: "TODAS",
          tipologiaNome: "Todas as tipologias",
          kit: k.kit,
          quantidade: totalUnidades,
          precoBase: k.valor!,
          multiplicador: 1,
          precoUnitario: k.valor!,
          total,
          pontos: null,
        };
      });

    await prisma.$transaction([
      prisma.itemServicoOrcamento.deleteMany({ where: { orcamentoId } }),
      prisma.itemServicoOrcamento.createMany({ data: novosItens }),
      prisma.orcamento.update({
        where: { id: orcamentoId },
        data: { totalServicosHgi: totalCalculado },
      }),
    ]);
  }

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true, totalCalculado };
}
