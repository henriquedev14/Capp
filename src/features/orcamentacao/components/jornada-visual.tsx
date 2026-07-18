import { CheckCircle2, Circle, AlertTriangle, Undo2, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { ETAPAS_JORNADA, type EtapaJornada, type OrcamentoJornadaEtapa } from "@/core/orcamentacao/entities/orcamento";
import { ETAPA_LABEL } from "@/features/orcamentacao/components/etapa-jornada-badge";

interface JornadaVisualProps {
  jornada: OrcamentoJornadaEtapa[];
}

function iconePorStatus(status: string | undefined) {
  switch (status) {
    case "CONCLUIDA":
    case "APROVADA":
      return { Icon: CheckCircle2, className: "text-success" };
    case "EM_ANDAMENTO":
      return { Icon: Clock, className: "text-primary" };
    case "BLOQUEADA":
      return { Icon: AlertTriangle, className: "text-destructive" };
    case "DEVOLVIDA":
      return { Icon: Undo2, className: "text-warning" };
    default:
      return { Icon: Circle, className: "text-muted-foreground/40" };
  }
}

/**
 * Jornada horizontal do orçamento (Parte 3 da spec): Levantamentos →
 * Composição → Materiais → Cotações → Revisão → Aprovação → Proposta.
 * Se `jornada` vier vazia (orçamentos criados antes desta funcionalidade),
 * mostra todas as etapas como "não iniciada" sem quebrar a tela.
 */
export function JornadaVisual({ jornada }: JornadaVisualProps) {
  const porEtapa = new Map(jornada.map((j) => [j.etapa, j]));

  const concluidas = ETAPAS_JORNADA.filter((e) => {
    const s = porEtapa.get(e)?.status;
    return s === "CONCLUIDA" || s === "APROVADA";
  }).length;
  const progresso = Math.round((concluidas / ETAPAS_JORNADA.length) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Jornada do orçamento
        </span>
        <span className="text-xs text-muted-foreground">{progresso}% concluído</span>
      </div>

      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {ETAPAS_JORNADA.map((etapa, idx) => {
          const item = porEtapa.get(etapa);
          const { Icon, className } = iconePorStatus(item?.status);
          const ultima = idx === ETAPAS_JORNADA.length - 1;

          return (
            <div key={etapa} className="flex items-center">
              <div className="flex flex-col items-center gap-1 min-w-[84px]">
                <Icon className={cn("h-5 w-5", className)} />
                <span className="text-center text-[11px] font-medium leading-tight text-foreground">
                  {ETAPA_LABEL[etapa as EtapaJornada]}
                </span>
                {item?.responsavelId && (
                  <span className="text-[10px] text-muted-foreground">atribuído</span>
                )}
              </div>
              {!ultima && (
                <div
                  className={cn(
                    "mt-2.5 h-px w-6 shrink-0",
                    item?.status === "CONCLUIDA" || item?.status === "APROVADA"
                      ? "bg-success/50"
                      : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
