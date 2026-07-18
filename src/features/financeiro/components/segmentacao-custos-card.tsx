"use client";

import { PieChart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/features/dashboard/components/kpi";
import type { SegmentacaoCustos } from "@/features/financeiro/actions/cadastros-actions";

const CORES = ["bg-primary", "bg-success", "bg-warning", "bg-destructive", "bg-muted-foreground"];

function Barra({ itens, total }: { itens: { label: string; valor: number }[]; total: number }) {
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma conta paga esse mês ainda.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {itens.map((item, idx) => {
        const pct = total > 0 ? (item.valor / total) * 100 : 0;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">{item.label}</span>
            <div className="relative h-5 flex-1 rounded bg-secondary/60">
              <div
                className={`absolute inset-y-0 left-0 rounded ${CORES[idx % CORES.length]}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="w-24 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
              {formatBRL(item.valor)}
            </span>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function SegmentacaoCustosCard({ dados }: { dados: SegmentacaoCustos }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 border-b border-border">
        <PieChart className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-[15px]">Segmentação de Custos — mês atual</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-5">
        {dados.totalNaoClassificado > 0 && (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
            {formatBRL(dados.totalNaoClassificado)} em contas com categoria ainda não classificada — vá em
            Financeiro → Categorias de Despesa pra classificar.
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comportamento</p>
          <Barra itens={dados.porComportamento} total={dados.totalGeral} />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Natureza</p>
          <Barra itens={dados.porNatureza} total={dados.totalGeral} />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apropriação</p>
          <Barra itens={dados.porApropriacao} total={dados.totalGeral} />
        </div>
      </CardContent>
    </Card>
  );
}
