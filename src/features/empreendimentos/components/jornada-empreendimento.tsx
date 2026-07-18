import { CheckCircle2, Circle, XCircle } from "lucide-react";

const ETAPAS_JORNADA = [
  { status: "PROSPECCAO", label: "Prospecção" },
  { status: "COMERCIAL", label: "Comercial" },
  { status: "ORCAMENTACAO", label: "Orçamentação" },
  { status: "NEGOCIACAO", label: "Negociação" },
  { status: "CONTRATADO", label: "Contrato" },
  { status: "SUPRIMENTOS", label: "Suprimentos" },
  { status: "PRODUCAO", label: "Produção" },
  { status: "CONCLUIDO", label: "Concluído" },
] as const;

/**
 * Jornada do empreendimento — todas as etapas do processo numa linha
 * horizontal, com a atual destacada. Responde "onde estamos" e "pra
 * onde vamos" sem precisar rolar a página nem adivinhar pelo texto do
 * status sozinho.
 */
export function JornadaEmpreendimento({ statusAtual }: { statusAtual: string }) {
  if (statusAtual === "ARQUIVADO") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-muted-foreground/30 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        <XCircle className="h-4 w-4" />
        Empreendimento arquivado — fora do fluxo ativo.
      </div>
    );
  }

  const idxAtual = ETAPAS_JORNADA.findIndex((e) => e.status === statusAtual);

  return (
    <div className="flex items-center overflow-x-auto rounded-lg border border-border bg-card px-4 py-3">
      {ETAPAS_JORNADA.map((etapa, idx) => {
        const concluida = idxAtual > idx;
        const atual = idxAtual === idx;
        return (
          <div key={etapa.status} className="flex shrink-0 items-center">
            <div className="flex flex-col items-center gap-1">
              {concluida ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : atual ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/30" />
              )}
              <span
                className={`whitespace-nowrap text-[11px] font-medium ${
                  atual ? "text-primary" : concluida ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                {etapa.label}
              </span>
            </div>
            {idx < ETAPAS_JORNADA.length - 1 && (
              <div className={`mx-2 h-0.5 w-8 shrink-0 sm:w-14 ${concluida ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
