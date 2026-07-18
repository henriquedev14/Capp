"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Inbox, Undo2, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard, formatBRL, formatBRLCompacto, calcularDelta } from "@/features/dashboard/components/kpi";
import type { DashboardData } from "@/features/dashboard/lib/queries";

export function ViewCoordenador({ data }: { data: DashboardData }) {
  const aguardandoAprovacao = data.orcamentos
    .filter((o) => o.status === "ENVIADO_APROVACAO_GESTOR")
    .sort((a, b) => a.atualizadoEm.getTime() - b.atualizadoEm.getTime()); // mais antigo primeiro

  const devolvidosMes = data.orcamentos.filter((o) => {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    return o.status === "ORCAMENTO_DEVOLVIDO" && o.atualizadoEm >= inicioMes;
  }).length;

  const valorAguardando = aguardandoAprovacao.reduce((s, o) => s + o.totalGeral, 0);
  const deltaAprovados = calcularDelta(
    data.mes.orcamentosAprovados,
    data.mes.orcamentosAprovadosMesAnterior
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Aguardando minha aprovação"
          value={aguardandoAprovacao.length}
          hint={formatBRLCompacto(valorAguardando)}
          tone={aguardandoAprovacao.length > 3 ? "warning" : "primary"}
          icon={Inbox}
        />
        <KpiCard
          label="Aprovados no mês"
          value={data.mes.orcamentosAprovados}
          hint={formatBRLCompacto(data.mes.valorAprovado)}
          trend={{ delta: deltaAprovados, label: "vs anterior" }}
          tone="success"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Devolvidos no mês"
          value={devolvidosMes}
          hint="pedidos de revisão feitos"
          tone="default"
          icon={Undo2}
        />
        <KpiCard
          label="Tempo médio na fila"
          value={
            aguardandoAprovacao.length > 0
              ? `${Math.round(
                  aguardandoAprovacao.reduce(
                    (s, o) =>
                      s + (Date.now() - o.atualizadoEm.getTime()) / (1000 * 60 * 60 * 24),
                    0
                  ) / aguardandoAprovacao.length
                )}d`
              : "—"
          }
          hint="dias parado no gestor"
          tone={aguardandoAprovacao.length > 0 ? "warning" : "default"}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">
            Fila de aprovações ({aguardandoAprovacao.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {aguardandoAprovacao.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Fila vazia. Nenhum orçamento aguardando aprovação.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {aguardandoAprovacao.map((o) => {
                const dias = Math.floor(
                  (Date.now() - o.atualizadoEm.getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <Link
                    key={o.id}
                    href={`/empreendimentos/${o.empreendimentoId}/orcamento`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {o.empreendimentoNome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Revisão {o.revisao} · há {dias} {dias === 1 ? "dia" : "dias"}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatBRL(o.totalGeral)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
