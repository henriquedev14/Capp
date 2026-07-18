import { Gem } from "lucide-react";

import { cn } from "@/lib/utils";
import { getTierOption } from "@/features/tiers/constants";

/**
 * Cores por tier — quanto mais alto o padrão, mais destaque visual.
 * Tier 0 usa o token "graphite" (premium/escuro), descendo em intensidade
 * até o Tier 3 (neutro). Segue os mesmos tokens semânticos do StatusBadge.
 */
const CORES_POR_TIER: Record<number, string> = {
  0: "bg-graphite text-graphite-foreground",
  1: "bg-primary/10 text-primary",
  2: "bg-warning/10 text-warning",
  3: "bg-muted text-muted-foreground",
};

interface TierBadgeProps {
  tier?: number | null;
  size?: "sm" | "md";
  /** Exibe o nome completo do tier além do rótulo curto (padrão: só em md) */
  comNome?: boolean;
  /** O que renderizar quando tier é null: nada (padrão) ou um badge "Sem tier" */
  fallback?: "nada" | "sem-tier";
  className?: string;
}

export function TierBadge({
  tier,
  size = "sm",
  comNome,
  fallback = "nada",
  className,
}: TierBadgeProps) {
  const option = getTierOption(tier);

  if (!option) {
    if (fallback === "nada") return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-dashed border-border font-medium text-muted-foreground whitespace-nowrap",
          size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
          className
        )}
      >
        Sem tier
      </span>
    );
  }

  const mostrarNome = comNome ?? size === "md";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
        CORES_POR_TIER[option.value],
        className
      )}
      title={`${option.labelCurto} — ${option.nome}`}
    >
      <Gem className={cn("shrink-0", size === "md" ? "h-3.5 w-3.5" : "h-3 w-3")} />
      {option.labelCurto}
      {mostrarNome && <span className="font-normal opacity-90">· {option.nome}</span>}
    </span>
  );
}
