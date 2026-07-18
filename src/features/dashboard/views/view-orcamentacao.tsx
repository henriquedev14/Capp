"use client";

import Link from "next/link";
import { FileEdit, Send, CheckCircle2, Undo2, ArrowRight, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KpiCard,
  formatBRL,
  formatBRLCompacto,
} from "@/features/dashboard/components/kpi";
import type { DashboardData, OrcamentoResumo } from "@/features/dashboard/lib/queries";

const LABELS_STATUS: Record<string, string> = {
  EM_LEVANTAMENTO: "Em edição",
  ENVIADO_APROVACAO_GESTOR: "Aguardando gestor",
  ORCAMENTO_APROVADO: "Aprovado",
  ORCAMENTO_DEVOLVIDO: "Devolvido — reajustar",
};

export function ViewOrcamentacao({
  data,
  usuarioLogadoId,
}: {
  data: DashboardData;
  usuarioLogadoId: string | null;
}) {
  const meusEmpIds = new Set(
    usuarioLogadoId
      ? data.empreendimentos
          .filter((e) => e.responsavelOrcamentacaoUserId === usuarioLogadoId)
          .map((e) => e.id)
      : data.empreendimentos.map((e) => e.id)
  );

  const meusOrcs = data.orcamentos.filter((o) => meusEmpIds.has(o.empreendimentoId));

  const emEdicao = meusOrcs.filter((o) => o.status === "EM_LEVANTAMENTO");
  const enviados = meusOrcs.filter((o) => o.status === "ENVIADO_APROVACAO_GESTOR");
  const devolvidos = meusOrcs.filter((o) => o.status === "ORCAMENTO_DEVOLVIDO");

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const aprovadosMes = meusOrcs.filter(
    (o) => o.status === "ORCAMENTO_APROVADO" && o.atualizadoEm >= inicioMes
  );

  return (
    <div className="flex flex-col gap-6">
      {!usuarioLogadoId && (
        <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
          Nenhum usuário identificado — mostrando dados de todos os orçamentos como
          demonstração.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Em edição"
          value={emEdicao.length}
          hint={formatBRLCompacto(emEdicao.reduce((s, o) => s + o.totalGeral, 0))}
          tone="primary"
          icon={FileEdit}
        />
        <KpiCard
          label="Enviados ao gestor"
          value={enviados.length}
          hint="aguardando aprovação"
          tone="default"
          icon={Send}
        />
        <KpiCard
          label="Devolvidos"
          value={devolvidos.length}
          hint="para reajuste"
          tone={devolvidos.length > 0 ? "warning" : "default"}
          icon={Undo2}
        />
        <KpiCard
          label="Aprovados no mês"
          value={aprovadosMes.length}
          hint={formatBRLCompacto(aprovadosMes.reduce((s, o) => s + o.totalGeral, 0))}
          tone="success"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Tempo médio de proposta"
          value={
            data.kpisCronologicos.orcamentacao.tempoMedioDias !== null
              ? `${data.kpisCronologicos.orcamentacao.tempoMedioDias.toFixed(1)} dias`
              : "—"
          }
          hint={
            data.kpisCronologicos.orcamentacao.amostras > 0
              ? `média de ${data.kpisCronologicos.orcamentacao.amostras} empreendimento(s)`
              : "ainda sem dado suficiente"
          }
          tone="primary"
          icon={Clock}
        />
        <KpiCard
          label="Revisões por proposta"
          value={
            data.kpisCronologicos.orcamentacao.mediaRevisoes !== null
              ? data.kpisCronologicos.orcamentacao.mediaRevisoes.toFixed(1)
              : "—"
          }
          hint="média — acima de 2 pode indicar retrabalho"
          tone={
            data.kpisCronologicos.orcamentacao.mediaRevisoes !== null &&
            data.kpisCronologicos.orcamentacao.mediaRevisoes > 2
              ? "warning"
              : "default"
          }
          icon={ArrowRight}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListaOrcs
          titulo={`Em edição (${emEdicao.length})`}
          itens={emEdicao}
          corBorda="border-primary/30"
        />
        <ListaOrcs
          titulo={`Devolvidos para reajuste (${devolvidos.length})`}
          itens={devolvidos}
          corBorda="border-warning/30"
          fundo="bg-warning/5"
        />
      </div>

      <ListaOrcs
        titulo={`Enviados aguardando gestor (${enviados.length})`}
        itens={enviados}
        corBorda="border-border"
      />
    </div>
  );
}

function ListaOrcs({
  titulo,
  itens,
  corBorda,
  fundo,
}: {
  titulo: string;
  itens: OrcamentoResumo[];
  corBorda: string;
  fundo?: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-[15px]">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada aqui no momento.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {itens.map((o) => (
              <Link
                key={o.id}
                href={`/empreendimentos/${o.empreendimentoId}/orcamento`}
                className={`flex items-center justify-between gap-3 rounded-lg border ${corBorda} ${fundo ?? ""} px-3 py-2 transition-colors hover:bg-secondary/40`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {o.empreendimentoNome}
                  </span>
                  <span className="text-xs text-muted-foreground">Revisão {o.revisao}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatBRL(o.totalGeral)}
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
