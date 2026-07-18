import { cn } from "@/lib/utils";
import type { StatusRemessa } from "@/core/expedicao/entities/expedicao";

const CONFIG: Record<StatusRemessa, { label: string; className: string }> = {
  RASCUNHO: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  AGUARDANDO_SEPARACAO: { label: "Aguardando separação", className: "bg-secondary text-foreground" },
  EM_SEPARACAO: { label: "Em separação", className: "bg-secondary text-foreground" },
  AGUARDANDO_CONFERENCIA: { label: "Aguardando conferência", className: "bg-warning/15 text-warning" },
  EM_CONFERENCIA: { label: "Em conferência", className: "bg-warning/15 text-warning" },
  LIBERADA_CARREGAMENTO: { label: "Liberada", className: "bg-success/15 text-success" },
  PARCIALMENTE_EXPEDIDA: { label: "Em rota", className: "bg-primary/15 text-primary" },
  TOTALMENTE_EXPEDIDA: { label: "Expedida", className: "bg-primary/15 text-primary" },
  EM_TRANSITO: { label: "Em rota", className: "bg-primary/15 text-primary" },
  ENTREGUE: { label: "Entregue", className: "bg-success/15 text-success" },
  CANCELADA: { label: "Cancelada", className: "bg-destructive/15 text-destructive" },
};

export function StatusRemessaBadge({ status, className }: { status: string; className?: string }) {
  const config = CONFIG[status as StatusRemessa] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
