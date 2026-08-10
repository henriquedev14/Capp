import { cn } from "@/lib/utils";
import type { EtapaJornada } from "@/core/orcamentacao/entities/orcamento";

const ORDEM_ETAPAS: EtapaJornada[] = [
  "LEVANTAMENTOS",
  "COMPOSICAO",
  "MATERIAIS",
  "COTACOES",
  "REVISAO",
  "APROVACAO",
  "PROPOSTA",
];

const LABEL_CURTO: Record<EtapaJornada, string> = {
  LEVANTAMENTOS: "Levant.",
  COMPOSICAO: "Compos.",
  MATERIAIS: "Materiais",
  COTACOES: "Cotações",
  REVISAO: "Revisão",
  APROVACAO: "Aprov.",
  PROPOSTA: "Proposta",
};

interface Props {
  etapa: EtapaJornada | string | null;
  status?: string | null;
  className?: string;
}

/**
 * Barra de progresso visual da Jornada — substitui o badge de texto
 * único. Uma bolinha por etapa, conectadas, com a atual destacada —
 * dá pra ver de relance quem está quase terminando (Proposta) vs quem
 * está começando (Levantamentos), sem precisar ler texto linha por
 * linha. Pedido pelo Henrique em 10/08/2026.
 */
export function JornadaProgressoVisual({ etapa, status, className }: Props) {
  if (!etapa) {
    return <span className={cn("text-xs text-muted-foreground", className)}>Sem etapa</span>;
  }

  const indiceAtual = ORDEM_ETAPAS.indexOf(etapa as EtapaJornada);
  const bloqueada = status === "BLOQUEADA";
  const devolvida = status === "DEVOLVIDA";

  if (indiceAtual === -1) {
    return <span className={cn("text-xs text-muted-foreground", className)}>{etapa}</span>;
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center">
        {ORDEM_ETAPAS.map((et, i) => {
          const concluida = i < indiceAtual;
          const atual = i === indiceAtual;
          return (
            <div key={et} className="flex items-center">
              <div
                title={LABEL_CURTO[et]}
                className={cn(
                  "flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  concluida && "border-success bg-success",
                  atual && !bloqueada && !devolvida && "h-3 w-3 border-primary bg-primary",
                  atual && bloqueada && "h-3 w-3 border-destructive bg-destructive",
                  atual && devolvida && "h-3 w-3 border-warning bg-warning",
                  !concluida && !atual && "border-border bg-background"
                )}
              />
              {i < ORDEM_ETAPAS.length - 1 && (
                <div className={cn("h-0.5 w-3 shrink-0", concluida ? "bg-success" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
      <span
        className={cn(
          "text-[10.5px] font-medium",
          bloqueada ? "text-destructive" : devolvida ? "text-warning" : "text-foreground"
        )}
      >
        {LABEL_CURTO[etapa as EtapaJornada]}
        {bloqueada && " · Bloqueada"}
        {devolvida && " · Devolvida"}
      </span>
    </div>
  );
}
