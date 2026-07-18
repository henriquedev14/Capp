import { cn } from "@/lib/utils";
import { getStatusOption, type StatusGrupo } from "@/features/empreendimentos/constants";

const CORES_POR_GRUPO: Record<StatusGrupo, string> = {
  prospeccao: "bg-muted text-muted-foreground",
  comercial:  "bg-warning/10 text-warning",
  execucao:   "bg-primary/10 text-primary",
  concluido:  "bg-success/10 text-success",
  arquivado:  "bg-muted text-muted-foreground line-through",
};

const DOT_POR_GRUPO: Record<StatusGrupo, string> = {
  prospeccao: "bg-muted-foreground",
  comercial:  "bg-warning",
  execucao:   "bg-primary",
  concluido:  "bg-success",
  arquivado:  "bg-muted-foreground",
};

export function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const option = getStatusOption(status);
  if (!option) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
        CORES_POR_GRUPO[option.grupo]
      )}
    >
      <span className={cn("rounded-full shrink-0", size === "md" ? "h-2 w-2" : "h-1.5 w-1.5", DOT_POR_GRUPO[option.grupo])} />
      {option.label}
    </span>
  );
}
