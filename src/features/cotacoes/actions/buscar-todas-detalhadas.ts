import { prisma } from "@/infra/db/prisma/client";
import { buscarCotacaoDetalhe } from "@/features/cotacoes/actions/cotacao-actions";
import type { CotacaoDetalhe } from "@/features/cotacoes/components/cotacao-detail-view";

/**
 * Busca o detalhe completo de TODAS as cotações de um empreendimento
 * de uma vez — pra montar a visão unificada por abas (Etapa 1 da
 * unificação Cotação, desenho aprovado em 06/08/2026). Continua sendo
 * N registros Cotacao por trás, um por fornecedor; só a tela que
 * agrupa visualmente.
 */
export async function buscarTodasCotacoesDetalhadas(empreendimentoId: string): Promise<CotacaoDetalhe[]> {
  const cotacoesIds = await prisma.cotacao.findMany({
    where: { empreendimentoId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const detalhes = await Promise.all(
    cotacoesIds.map((c) => buscarCotacaoDetalhe(c.id, empreendimentoId))
  );

  return detalhes.filter((d): d is CotacaoDetalhe => d !== null);
}
