/**
 * Padrão central de drill-down do Analytics — uma Server Action única
 * (`buscarDrilldownAnalytics`) despacha por `metricKey` pra um handler
 * registrado, em vez de uma action nova por card. Desenhado com o
 * Henrique em 14/08/2026.
 */

export interface DrilldownFiltros {
  periodoInicio?: string; // ISO date
  periodoFim?: string;
  clienteId?: string;
  empreendimentoId?: string;
  etapa?: string;
  responsavelId?: string;
  origem?: "NORMAL" | "LEGADO";
  tier?: number;
  kit?: string;
  empresaId?: string;
  risco?: string;
}

export interface DrilldownLinha {
  id: string;
  empreendimentoId: string | null;
  empreendimentoNome: string;
  cliente: string | null;
  etapa: string | null;
  valor: number | null;
  responsavel: string | null;
  detalhe: string | null;
  href: string;
}

export interface DrilldownResultado {
  metricKey: string;
  titulo: string;
  definicao: string;
  valorConsolidado: number | null;
  formatoValor: "moeda" | "numero" | "percentual";
  totalRegistros: number;
  pagina: number;
  totalPaginas: number;
  linhas: DrilldownLinha[];
}

export interface DrilldownHandler {
  titulo: string;
  definicao: string;
  formatoValor: "moeda" | "numero" | "percentual";
  buscar: (filtros: DrilldownFiltros, pagina: number, tamanhoPagina: number) => Promise<{
    valorConsolidado: number | null;
    totalRegistros: number;
    linhas: DrilldownLinha[];
  }>;
}
