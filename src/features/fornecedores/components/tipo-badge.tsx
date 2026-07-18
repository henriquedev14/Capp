import { cn } from "@/lib/utils";
import { TIPOS_FORNECEDOR } from "@/features/fornecedores/schemas/fornecedor-schema";
import type { TipoFornecedor } from "@/core/fornecedores/entities/fornecedor";

function getLabelTipo(tipo: TipoFornecedor): string {
  return TIPOS_FORNECEDOR.find((t) => t.value === tipo)?.label ?? tipo;
}

interface TipoBadgeProps {
  tipo: TipoFornecedor;
  className?: string;
}

export function TipoBadge({ tipo, className }: TipoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground whitespace-nowrap",
        className
      )}
    >
      {getLabelTipo(tipo)}
    </span>
  );
}

/** Lista de badges — exibe até `max` e trunca o resto com "+N". */
export function TipoBadgeList({
  tipos,
  max = 2,
  className,
}: {
  tipos: TipoFornecedor[];
  max?: number;
  className?: string;
}) {
  const visiveis = tipos.slice(0, max);
  const ocultos = tipos.length - max;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {visiveis.map((t) => (
        <TipoBadge key={t} tipo={t} />
      ))}
      {ocultos > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{ocultos}
        </span>
      )}
    </span>
  );
}
