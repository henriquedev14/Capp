"use server";

import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { DRILLDOWN_HANDLERS } from "@/features/analytics/lib/drilldown/registry";
import type { DrilldownFiltros, DrilldownResultado } from "@/features/analytics/lib/drilldown/types";

const TAMANHO_PAGINA = 25;

/**
 * Única Server Action pra todo drill-down do Analytics — despacha por
 * metricKey pro handler registrado. Query pontual, sob demanda (não
 * recarrega `carregarAnalyticsData()` inteiro). Desenhado com o
 * Henrique em 14/08/2026.
 */
export async function buscarDrilldownAnalytics(
  metricKey: string,
  filtros: DrilldownFiltros,
  pagina = 1
): Promise<DrilldownResultado | { erro: string }> {
  // Checagem mínima por ora — Bloco 1 só cobre KPIs da Visão
  // Executiva. Quando drill-down de outras abas (Engenharia,
  // Suprimentos etc.) for adicionado, cada handler declarar sua
  // própria permissão fica melhor do que uma checagem genérica aqui.
  try {
    await exigirPermissao(PERMISSOES.DASHBOARD_VER_DIRETORIA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const handler = DRILLDOWN_HANDLERS[metricKey];
  if (!handler) return { erro: `Métrica "${metricKey}" não tem drill-down configurado.` };

  const { valorConsolidado, totalRegistros, linhas } = await handler.buscar(filtros, pagina, TAMANHO_PAGINA);

  return {
    metricKey,
    titulo: handler.titulo,
    definicao: handler.definicao,
    valorConsolidado,
    formatoValor: handler.formatoValor,
    totalRegistros,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(totalRegistros / TAMANHO_PAGINA)),
    linhas,
  };
}
