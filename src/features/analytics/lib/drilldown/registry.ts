import { carteiraAtivaHandler } from "@/features/analytics/lib/drilldown/handlers/carteira-ativa";
import { valorNegociacaoHandler } from "@/features/analytics/lib/drilldown/handlers/valor-negociacao";
import { semInteracao7dHandler } from "@/features/analytics/lib/drilldown/handlers/sem-interacao-7d";
import { followupsVencidosHandler } from "@/features/analytics/lib/drilldown/handlers/followups-vencidos";
import { pedidosAtrasadosHandler } from "@/features/analytics/lib/drilldown/handlers/pedidos-atrasados";
import { opsAtrasadasHandler } from "@/features/analytics/lib/drilldown/handlers/ops-atrasadas";
import { financeiroVencidoHandler } from "@/features/analytics/lib/drilldown/handlers/financeiro-vencido";
import { engenhariaAtrasadosHandler } from "@/features/analytics/lib/drilldown/handlers/engenharia-atrasados";
import { engenhariaBloqueadosHandler } from "@/features/analytics/lib/drilldown/handlers/engenharia-bloqueados";
import type { DrilldownHandler } from "@/features/analytics/lib/drilldown/types";

/**
 * Registro central — cada novo KPI vira 1 entrada aqui + 1 arquivo de
 * handler, nunca uma Server Action nova. Pedido pelo Henrique em
 * 14/08/2026: "evite uma Server Action nova para cada card".
 */
export const DRILLDOWN_HANDLERS: Record<string, DrilldownHandler> = {
  "carteira-ativa": carteiraAtivaHandler,
  "valor-negociacao": valorNegociacaoHandler,
  "sem-interacao-7d": semInteracao7dHandler,
  "followups-vencidos": followupsVencidosHandler,
  "pedidos-atrasados": pedidosAtrasadosHandler,
  "ops-atrasadas": opsAtrasadasHandler,
  "financeiro-vencido": financeiroVencidoHandler,
  "engenharia-atrasados": engenhariaAtrasadosHandler,
  "engenharia-bloqueados": engenhariaBloqueadosHandler,
};

export type MetricKey = keyof typeof DRILLDOWN_HANDLERS;
