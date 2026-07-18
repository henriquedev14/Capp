import Link from "next/link";
import { FileSpreadsheet, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CotacaoResumo {
  id: string;
  numero: string;
  status: string;
  fornecedorNome: string;
  totalGeral: number;
  totalItens: number;
  atualizadoEm: Date;
}

interface Props {
  empreendimentoId: string;
  cotacoes: CotacaoResumo[];
}

const LABELS_STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  RESPONDIDA: "Respondida",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

const CORES_STATUS: Record<string, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  ENVIADA: "bg-primary/10 text-primary",
  RESPONDIDA: "bg-warning/10 text-warning",
  ACEITA: "bg-success/10 text-success",
  RECUSADA: "bg-muted text-muted-foreground line-through",
};

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function CotacoesList({ empreendimentoId, cotacoes }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <FileSpreadsheet className="h-[18px] w-[18px] text-accent-foreground" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-[15px]">Cotações ({cotacoes.length})</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Documentos gerados a partir do levantamento consolidado, um por fornecedor.
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {cotacoes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma cotação gerada ainda.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Use o botão &quot;Gerar Cotação&quot; acima para consultar fornecedores.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cotacoes.map((c) => (
              <Link
                key={c.id}
                href={`/empreendimentos/${empreendimentoId}/orcamento/cotacoes/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-muted-foreground">
                    {c.numero}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {c.fornecedorNome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.totalItens} {c.totalItens === 1 ? "item" : "itens"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase " +
                      (CORES_STATUS[c.status] ?? "bg-muted text-muted-foreground")
                    }
                  >
                    {LABELS_STATUS[c.status] ?? c.status}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatBRL(c.totalGeral)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
