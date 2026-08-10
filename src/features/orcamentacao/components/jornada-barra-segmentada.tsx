import { cn } from "@/lib/utils";
import type { EtapaJornada, StatusEtapaJornada } from "@/core/orcamentacao/entities/orcamento";

const ORDEM_ETAPAS: EtapaJornada[] = [
  "LEVANTAMENTOS",
  "COMPOSICAO",
  "MATERIAIS",
  "COTACOES",
  "REVISAO",
  "APROVACAO",
  "PROPOSTA",
];

const LABEL_ETAPA: Record<EtapaJornada, string> = {
  LEVANTAMENTOS: "Levantamentos",
  COMPOSICAO: "Composição",
  MATERIAIS: "Materiais",
  COTACOES: "Cotações",
  REVISAO: "Revisão",
  APROVACAO: "Aprovação",
  PROPOSTA: "Proposta",
};

interface Props {
  etapa: EtapaJornada | null;
  status: StatusEtapaJornada | null;
  temOrcamento: boolean;
  className?: string;
}

export function JornadaBarraSegmentada({ etapa, status, temOrcamento, className }: Props) {
  if (!temOrcamento) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="h-1.5 w-full rounded-full bg-secondary" />
        <span className="text-[11px] font-medium text-muted-foreground">Sem levantamento iniciado</span>
      </div>
    );
  }

  const indiceAtual = etapa ? ORDEM_ETAPAS.indexOf(etapa) : -1;
  const bloqueada = status === "BLOQUEADA";
  const devolvida = status === "DEVOLVIDA";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {ORDEM_ETAPAS.map((et, i) => {
          const concluida = i < indiceAtual;
          const atual = i === indiceAtual;
          return (
            <div
              key={et}
              title={LABEL_ETAPA[et]}
              className={cn(
                "flex-1 transition-colors",
                concluida && "bg-success",
                atual && !bloqueada && !devolvida && "bg-primary",
                atual && bloqueada && "bg-destructive",
                atual && devolvida && "bg-warning",
                !concluida && !atual && "bg-secondary"
              )}
            />
          );
        })}
      </div>
      <span
        className={cn(
          "text-[11px] font-medium",
          bloqueada ? "text-destructive" : devolvida ? "text-warning" : "text-muted-foreground"
        )}
      >
        {etapa ? LABEL_ETAPA[etapa] : "—"} · etapa {indiceAtual + 1} de {ORDEM_ETAPAS.length}
        {bloqueada && " · bloqueada"}
        {devolvida && " · devolvida"}
      </span>
    </div>
  );
}
