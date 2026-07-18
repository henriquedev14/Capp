"use client";

import * as React from "react";
import { Loader2, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calcularProdutividadePorOperador, contarKitsFinalizados, type ProdutividadeLinha, type KitsFinalizados } from "@/features/producao/actions/producao-actions";

type Periodo = "hoje" | "semana" | "mes";

function calcularIntervalo(periodo: Periodo): { inicio: Date; fim: Date } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + 1);

  if (periodo === "hoje") {
    return { inicio: hoje, fim };
  }
  if (periodo === "semana") {
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - inicio.getDay()); // volta pro domingo
    return { inicio, fim };
  }
  // mês
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { inicio, fim };
}

function formatNum(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * Analytics de Produção — substitui a planilha manual de produtividade.
 * Mesma lógica que já existia lá (U.H. Referência por bancada, meta
 * diária de 50 U.H./pessoa), só que calculado automático a partir dos
 * registros lançados no tablet, sem digitar nada em Excel.
 */
export function AnalyticsProducaoView() {
  const [periodo, setPeriodo] = React.useState<Periodo>("semana");
  const [linhas, setLinhas] = React.useState<ProdutividadeLinha[]>([]);
  const [kits, setKits] = React.useState<KitsFinalizados | null>(null);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    setCarregando(true);
    const { inicio, fim } = calcularIntervalo(periodo);
    Promise.all([calcularProdutividadePorOperador(inicio, fim), contarKitsFinalizados(inicio, fim)])
      .then(([prod, k]) => {
        setLinhas(prod);
        setKits(k);
      })
      .finally(() => setCarregando(false));
  }, [periodo]);

  // Agrupa por operador (uma pessoa pode ter passado por mais de uma
  // bancada no período) pra ter uma visão "resumo por pessoa" além do
  // detalhe por bancada.
  const porOperador = React.useMemo(() => {
    const mapa = new Map<string, { nome: string; somaPercentual: number; qtdBancadas: number }>();
    for (const l of linhas) {
      const atual = mapa.get(l.operadorId) ?? { nome: l.operadorNome, somaPercentual: 0, qtdBancadas: 0 };
      atual.somaPercentual += l.percentualMeta;
      atual.qtdBancadas += 1;
      mapa.set(l.operadorId, atual);
    }
    return Array.from(mapa.values())
      .map((o) => ({ nome: o.nome, mediaPercentual: o.somaPercentual / o.qtdBancadas }))
      .sort((a, b) => b.mediaPercentual - a.mediaPercentual);
  }, [linhas]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {(["hoje", "semana", "mes"] as Periodo[]).map((p) => (
          <Button key={p} size="sm" variant={periodo === p ? "default" : "outline"} onClick={() => setPeriodo(p)}>
            {p === "hoje" ? "Hoje" : p === "semana" ? "Esta semana" : "Este mês"}
          </Button>
        ))}
      </div>

      {/* Métrica principal — a que realmente importa pro chefe de
          produção: quantos apartamentos saíram PRONTOS de verdade (não
          é U.H. de nenhuma bancada isolada, é quem passou pela
          Finalização). Grande e destacada de propósito — é o "ver
          fácil" que foi pedido. */}
      {kits && (
        <Card className={kits.percentual >= 1 ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}>
          <CardContent className="flex flex-col items-center gap-1 py-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kits (apartamentos) finalizados —{" "}
              {periodo === "hoje" ? "hoje" : periodo === "semana" ? "esta semana" : "este mês"}
            </span>
            <span className={`text-5xl font-bold tabular-nums ${kits.percentual >= 1 ? "text-success" : "text-warning"}`}>
              {kits.quantidade}
              <span className="text-2xl text-muted-foreground"> / {kits.meta}</span>
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {(kits.percentual * 100).toFixed(0)}% da meta (50/dia)
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center gap-2 border-b border-border">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-[15px]">Média de meta por operador</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : porOperador.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro de produção nesse período.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {porOperador.map((o) => (
                <div key={o.nome} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-foreground">{o.nome}</span>
                  <div className="relative h-5 flex-1 rounded bg-secondary/60">
                    <div
                      className={`absolute inset-y-0 left-0 rounded ${o.mediaPercentual >= 1 ? "bg-success" : "bg-primary"}`}
                      style={{ width: `${Math.min(o.mediaPercentual * 100, 100)}%`, minWidth: "4px" }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                    {(o.mediaPercentual * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Detalhe por operador e bancada</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro de produção nesse período.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Operador</th>
                    <th className="px-3 py-2 text-left font-medium">Bancada</th>
                    <th className="px-3 py-2 text-right font-medium">Produção</th>
                    <th className="px-3 py-2 text-right font-medium">QTD.UH</th>
                    <th className="px-3 py-2 text-right font-medium">Meta %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {linhas.map((l) => (
                    <tr key={`${l.operadorId}-${l.bancadaId}`}>
                      <td className="px-3 py-2 text-foreground">{l.operadorNome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.bancadaNome}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatNum(l.producaoBruta)} {l.unidadeMedida === "METROS" ? "m" : "pç"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatNum(l.quantidadeUH)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                        {(l.percentualMeta * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
