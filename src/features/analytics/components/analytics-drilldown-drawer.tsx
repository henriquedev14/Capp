"use client";

import * as React from "react";
import Link from "next/link";
import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { buscarDrilldownAnalytics } from "@/features/analytics/actions/drilldown-actions";
import type { DrilldownFiltros, DrilldownResultado } from "@/features/analytics/lib/drilldown/types";

function formatValor(v: number | null, formato: DrilldownResultado["formatoValor"]): string {
  if (v == null) return "—";
  if (formato === "moeda") return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (formato === "percentual") return `${v.toFixed(1)}%`;
  return v.toLocaleString("pt-BR");
}

/**
 * Drawer padrão de drill-down — nenhum KPI do Analytics deve ser um
 * beco sem saída. Recebe só a metricKey e os filtros ativos da
 * página; a busca em si roda sob demanda (só quando abre), não
 * recarrega a página inteira. Desenhado com o Henrique em 14/08/2026.
 */
export function AnalyticsDrilldownDrawer({
  metricKey,
  filtros,
  aberto,
  onFechar,
}: {
  metricKey: string;
  filtros: DrilldownFiltros;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [carregando, setCarregando] = React.useState(false);
  const [dados, setDados] = React.useState<DrilldownResultado | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [pagina, setPagina] = React.useState(1);

  React.useEffect(() => {
    if (!aberto) return;
    setPagina(1);
    buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, metricKey]);

  async function buscar(p: number) {
    setCarregando(true);
    setErro(null);
    try {
      const r = await buscarDrilldownAnalytics(metricKey, filtros, p);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setDados(r);
      setPagina(p);
    } finally {
      setCarregando(false);
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onFechar}>
      <div
        className="flex h-full w-full max-w-lg flex-col bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{dados?.titulo ?? "Carregando..."}</p>
            {dados && <p className="mt-1 text-xs text-muted-foreground">{dados.definicao}</p>}
          </div>
          <button onClick={onFechar} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {dados && (
          <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
            <span className="text-2xl font-bold tabular-nums text-primary">
              {formatValor(dados.valorConsolidado, dados.formatoValor)}
            </span>
            <span className="text-xs text-muted-foreground">{dados.totalRegistros} registro(s)</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {carregando && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          )}

          {erro && <p className="p-5 text-sm text-destructive">{erro}</p>}

          {!carregando && dados && dados.linhas.length === 0 && (
            <p className="p-5 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</p>
          )}

          {!carregando &&
            dados?.linhas.map((l) => (
              <Link
                key={l.id}
                href={l.href}
                className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3 hover:bg-secondary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{l.empreendimentoNome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[l.cliente, l.responsavel, l.detalhe].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {l.valor != null && (
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    {formatValor(l.valor, "moeda")}
                  </span>
                )}
              </Link>
            ))}
        </div>

        {dados && dados.totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <button
              onClick={() => buscar(pagina - 1)}
              disabled={pagina <= 1 || carregando}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span className="text-xs text-muted-foreground">
              {pagina} de {dados.totalPaginas}
            </span>
            <button
              onClick={() => buscar(pagina + 1)}
              disabled={pagina >= dados.totalPaginas || carregando}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
