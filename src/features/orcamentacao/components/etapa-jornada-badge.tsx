import { cn } from "@/lib/utils";
import type { EtapaJornada } from "@/core/orcamentacao/entities/orcamento";

export const ETAPA_LABEL: Record<EtapaJornada, string> = {
  LEVANTAMENTOS: "Levantamentos",
  COMPOSICAO: "Composição",
  MATERIAIS: "Materiais",
  COTACOES: "Cotações",
  REVISAO: "Revisão",
  APROVACAO: "Aprovação",
  PROPOSTA: "Proposta",
};

const STATUS_ETAPA_CONFIG: Record<string, { label: string; className: string }> = {
  NAO_INICIADA: { label: "Não iniciada", className: "bg-muted text-muted-foreground" },
  EM_ANDAMENTO: { label: "Em andamento", className: "bg-primary/10 text-primary" },
  CONCLUIDA: { label: "Concluída", className: "bg-success/10 text-success" },
  BLOQUEADA: { label: "Bloqueada", className: "bg-destructive/10 text-destructive" },
  DEVOLVIDA: { label: "Devolvida", className: "bg-warning/10 text-warning" },
  APROVADA: { label: "Aprovada", className: "bg-success/10 text-success" },
  CANCELADA: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

export function EtapaJornadaBadge({
  etapa,
  status,
  className,
}: {
  etapa: EtapaJornada | string | null;
  status?: string | null;
  className?: string;
}) {
  if (!etapa) {
    return (
      <span className={cn("inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>
        Sem etapa
      </span>
    );
  }

  const label = ETAPA_LABEL[etapa as EtapaJornada] ?? etapa;
  const statusConfig = status ? STATUS_ETAPA_CONFIG[status] : null;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {statusConfig && (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
            statusConfig.className
          )}
        >
          {statusConfig.label}
        </span>
      )}
    </span>
  );
}
