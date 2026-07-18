import { cn } from "@/lib/utils";
import type { StatusOrcamento } from "@/core/orcamentacao/entities/orcamento";

const CONFIG: Record<StatusOrcamento, { label: string; className: string }> = {
  EM_LEVANTAMENTO:          { label: "Em levantamento",              className: "bg-muted text-muted-foreground" },
  ENVIADO_APROVACAO_GESTOR: { label: "Enviado p/ aprovação do gestor", className: "bg-primary/10 text-primary" },
  ORCAMENTO_APROVADO:       { label: "Orçamento aprovado",            className: "bg-success/10 text-success" },
  ORCAMENTO_DEVOLVIDO:      { label: "Orçamento devolvido",           className: "bg-destructive/10 text-destructive" },
};

export function StatusOrcamentoBadge({
  status,
  size = "sm",
  className,
}: {
  status: StatusOrcamento;
  size?: "sm" | "md";
  className?: string;
}) {
  const { label, className: colorClass } = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}

export const STATUS_ORCAMENTO_OPTIONS: { value: StatusOrcamento; label: string }[] = [
  { value: "EM_LEVANTAMENTO",          label: "Em levantamento" },
  { value: "ENVIADO_APROVACAO_GESTOR", label: "Enviado p/ aprovação do gestor" },
  { value: "ORCAMENTO_APROVADO",       label: "Orçamento aprovado" },
  { value: "ORCAMENTO_DEVOLVIDO",      label: "Orçamento devolvido" },
];
