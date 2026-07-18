import { Package, ClipboardCheck, Truck, Navigation, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

const ETAPAS = [
  { numero: 1, label: "Separação", sub: "Itens separados", icon: Package },
  { numero: 2, label: "Conferência", sub: "Itens conferidos", icon: ClipboardCheck },
  { numero: 3, label: "Carregamento", sub: "Carga carregada", icon: Truck },
  { numero: 4, label: "Em trânsito", sub: "A caminho do destino", icon: Navigation },
  { numero: 5, label: "Entrega confirmada", sub: "Recebimento validado", icon: CheckCircle2 },
];

/**
 * Legenda informativa da jornada — não é interativa nem ligada a uma
 * remessa específica (é um guia visual do processo geral). O progresso
 * real de cada remessa aparece na tabela/painel de detalhe.
 */
export function JornadaExpedicaoLegenda({ etapaAtiva }: { etapaAtiva?: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card px-6 py-5">
      {ETAPAS.map((etapa, idx) => {
        const ativa = etapaAtiva === etapa.numero;
        const concluida = etapaAtiva != null && etapa.numero < etapaAtiva;
        return (
          <div key={etapa.numero} className="flex items-center">
            <div className="flex min-w-[130px] flex-col items-center gap-1.5 text-center">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  ativa && "border-primary bg-primary/10 text-primary",
                  concluida && "border-success bg-success/10 text-success",
                  !ativa && !concluida && "border-border bg-secondary text-muted-foreground"
                )}
              >
                <etapa.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="flex items-center justify-center gap-1 text-sm font-semibold text-foreground">
                  <span className="text-xs text-muted-foreground">{etapa.numero}</span>
                  {etapa.label}
                </span>
                <span className="text-xs text-muted-foreground">{etapa.sub}</span>
              </div>
            </div>
            {idx < ETAPAS.length - 1 && (
              <div className={cn("mb-6 h-px w-10 shrink-0", concluida ? "bg-success/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
