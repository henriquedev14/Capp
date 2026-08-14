"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRLCompacto } from "@/features/dashboard/components/kpi";

const GRID = "#E5E1DB";
const AXIS = "#8B8578";
const PRIMARY = "#F57C20";
const GRAPHITE = "#1F252D";

function Empty({ children }: { children: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export function PipelineExecutivoChart({ dados }: { dados: { label: string; quantidade: number; valor: number }[] }) {
  if (!dados.some((d) => d.quantidade > 0)) return <Empty>Sem empreendimentos ativos no pipeline.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={dados} margin={{ top: 10, right: 12, bottom: 35, left: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} angle={-20} textAnchor="end" interval={0} />
        <YAxis yAxisId="qtd" allowDecimals={false} width={30} tick={{ fontSize: 10, fill: AXIS }} />
        <YAxis yAxisId="valor" orientation="right" width={62} tick={{ fontSize: 10, fill: AXIS }} tickFormatter={formatBRLCompacto} />
        <Tooltip
          formatter={(value, name) => [name === "Valor" ? formatBRLCompacto(Number(value)) : Number(value), name]}
          contentStyle={{ borderRadius: 10, borderColor: GRID, fontSize: 12 }}
        />
        <Bar yAxisId="qtd" dataKey="quantidade" name="Obras" fill={PRIMARY} radius={[5, 5, 0, 0]} maxBarSize={36} />
        <Bar yAxisId="valor" dataKey="valor" name="Valor" fill={GRAPHITE} radius={[5, 5, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarrasSimples({
  dados,
  dataKey = "valor",
  formato = "numero",
  height = 220,
}: {
  dados: { label: string; valor: number }[];
  dataKey?: string;
  formato?: "numero" | "moeda" | "horas";
  height?: number;
}) {
  if (!dados.some((d) => d.valor > 0)) return <Empty>Sem dados suficientes no período.</Empty>;
  const fmt = (v: number) => formato === "moeda" ? formatBRLCompacto(v) : formato === "horas" ? `${Math.round(v)}h` : `${Math.round(v)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 20, left: 12, bottom: 4 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: AXIS }} tickFormatter={fmt} />
        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10, fill: AXIS }} />
        <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ borderRadius: 10, borderColor: GRID, fontSize: 12 }} />
        <Bar dataKey={dataKey} fill={PRIMARY} radius={[0, 5, 5, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FluxoExpedicaoChart({ dados }: { dados: { label: string; valor: number }[] }) {
  return <BarrasSimples dados={dados} />;
}
