import * as React from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Card de KPI: número grande, legenda pequena, tendência opcional.
// Base de todos os widgets numéricos das visões por papel.
// Se `href` for passado, o card inteiro vira um link — com hover sutil
// avisando que dá pra clicar, sem precisar de nenhum ícone extra de seta.
export function KpiCard({
  label,
  value,
  hint,
  trend,
  tone = "default",
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { delta: number; label?: string };
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const toneClasses = {
    default: "border-border",
    success: "border-success/40 bg-success/5",
    warning: "border-warning/40 bg-warning/5",
    danger: "border-destructive/40 bg-destructive/5",
    primary: "border-primary/40 bg-primary/5",
  }[tone];

  const acentoLateral = {
    default: "before:bg-border",
    success: "before:bg-success",
    warning: "before:bg-warning",
    danger: "before:bg-destructive",
    primary: "before:bg-primary",
  }[tone];

  const iconTone = {
    default: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    primary: "text-primary",
  }[tone];

  const conteudo = (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-4 pl-5",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        toneClasses,
        acentoLateral,
        href && "transition-shadow hover:shadow-card-md cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon ? <Icon className={cn("h-4 w-4 shrink-0", iconTone)} /> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {(hint || trend) && (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
          {hint ? <span className="text-muted-foreground truncate">{hint}</span> : <span />}
          {trend ? <TrendIndicator delta={trend.delta} label={trend.label} /> : null}
        </div>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

function TrendIndicator({ delta, label }: { delta: number; label?: string }) {
  const isFlat = delta === 0;
  const isUp = delta > 0;
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  const color = isFlat
    ? "text-muted-foreground"
    : isUp
      ? "text-success"
      : "text-destructive";
  return (
    <span className={cn("flex items-center gap-0.5 font-medium tabular-nums", color)}>
      <Icon className="h-3 w-3" />
      {isFlat ? "—" : `${Math.abs(delta).toFixed(0)}%`}
      {label ? <span className="ml-1 text-muted-foreground font-normal">{label}</span> : null}
    </span>
  );
}

// Barra horizontal para distribuições por status/categoria.
// Sem lib externa — só CSS.
export function BarrasHorizontais({
  data,
  formatValue,
}: {
  data: { label: string; value: number; color?: string }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-xs text-muted-foreground truncate">
            {d.label}
          </span>
          <div className="relative h-6 flex-1 rounded bg-secondary/60">
            <div
              className="absolute inset-y-0 left-0 rounded transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.color ?? "hsl(var(--primary))",
                minWidth: d.value > 0 ? "4px" : "0",
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
            {formatValue ? formatValue(d.value) : d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function formatBRLCompacto(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatBRL(v);
}

export function calcularDelta(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

// Título de seção pra separar blocos dentro de cada visão
export function SecaoTitulo({
  titulo,
  descricao,
  icone: Icone,
}: {
  titulo: string;
  descricao?: string;
  icone?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      {Icone ? <Icone className="mt-0.5 h-4 w-4 text-muted-foreground" /> : null}
      <div>
        <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
        {descricao ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
    </div>
  );
}
