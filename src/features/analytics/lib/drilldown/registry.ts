import { carteiraAtivaHandler } from "@/features/analytics/lib/drilldown/handlers/carteira-ativa";
import { valorNegociacaoHandler } from "@/features/analytics/lib/drilldown/handlers/valor-negociacao";
import { semInteracao7dHandler } from "@/features/analytics/lib/drilldown/handlers/sem-interacao-7d";
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
};

export type MetricKey = keyof typeof DRILLDOWN_HANDLERS;
