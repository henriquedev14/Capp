"use client";

import Link from "next/link";
import { Briefcase, Building2, TrendingUp, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/features/empreendimentos/components/status-badge";
import {
  KpiCard,
  BarrasHorizontais,
  formatBRL,
  formatBRLCompacto,
} from "@/features/dashboard/components/kpi";
import type { DashboardData } from "@/features/dashboard/lib/queries";

const LABELS_STATUS: Record<string, string> = {
  PROSPECCAO: "Prospecção",
  COMERCIAL: "Comercial",
  ORCAMENTACAO: "Orçamentação",
  NEGOCIACAO: "Negociação",
  CONTRATADO: "Contratado",
  SUPRIMENTOS: "Suprimentos",
  PRODUCAO: "Produção",
  CONCLUIDO: "Concluído",
  ARQUIVADO: "Arquivado",
};

export function ViewComercial({
  data,
  usuarioLogadoId,
}: {
  data: DashboardData;
  usuarioLogadoId: string | null;
}) {
  // Se não tem usuário identificado ou ninguém tem responsabilidade cadastrada,
  // mostra todos os empreendimentos com bandeira de contexto.
  const meusEmpreendimentos = usuarioLogadoId
    ? data.empreendimentos.filter((e) => e.responsavelComercialUserId === usuarioLogadoId)
    : data.empreendimentos;

  const meusIds = new Set(meusEmpreendimentos.map((e) => e.id));
  const meusOrcamentos = data.orcamentos.filter((o) => meusIds.has(o.empreendimentoId));

  const emAtividade = meusEmpreendimentos.filter(
    (e) => e.status !== "CONCLUIDO" && e.status !== "ARQUIVADO"
  );
  const contratados = meusEmpreendimentos.filter((e) => e.status === "CONTRATADO").length;

  const valorPipeline = meusOrcamentos
    .filter(
      (o) =>
        o.status === "EM_LEVANTAMENTO" ||
        o.status === "ENVIADO_APROVACAO_GESTOR" ||
        o.status === "ORCAMENTO_DEVOLVIDO"
    )
    .reduce((s, o) => s + o.totalGeral, 0);

  const funil = Object.keys(LABELS_STATUS)
    .filter((s) => s !== "ARQUIVADO")
    .map((s) => ({
      label: LABELS_STATUS[s] ?? s,
      value: meusEmpreendimentos.filter((e) => e.status === s).length,
    }));

  const proximosMovimentos = meusEmpreendimentos
    .filter((e) => e.status !== "CONCLUIDO" && e.status !== "ARQUIVADO")
    .sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime())
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      {!usuarioLogadoId && (
        <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
          Nenhum usuário identificado — mostrando dados de todos os empreendimentos como
          demonstração. Em uso normal, cada comercial vê apenas os seus.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Meus empreendimentos ativos"
          value={emAtividade.length}
          hint={`${meusEmpreendimentos.length} total`}
          tone="primary"
          icon={Briefcase}
        />
        <KpiCard
          label="Meu pipeline"
          value={formatBRLCompacto(valorPipeline)}
          hint={`${meusOrcamentos.length} orçamentos ativos`}
          tone="default"
          icon={TrendingUp}
        />
        <KpiCard
          label="Contratados"
          value={contratados}
          hint="fechados até hoje"
          tone="success"
          icon={Building2}
        />
        <KpiCard
          label="Aguardando gestor"
          value={meusOrcamentos.filter((o) => o.status === "ENVIADO_APROVACAO_GESTOR").length}
          hint="orçamentos enviados"
          tone="default"
        />
        <KpiCard
          label="Tempo médio de prospecção"
          value={
            data.kpisCronologicos.comercial.tempoMedioProspeccaoDias !== null
              ? `${data.kpisCronologicos.comercial.tempoMedioProspeccaoDias.toFixed(1)} dias`
              : "—"
          }
          hint={
            data.kpisCronologicos.comercial.amostrasProspeccao > 0
              ? `média de ${data.kpisCronologicos.comercial.amostrasProspeccao} empreendimento(s)`
              : "ainda sem dado suficiente"
          }
          tone="primary"
          icon={ArrowRight}
        />
        <KpiCard
          label="Tempo médio de negociação"
          value={
            data.kpisCronologicos.comercial.tempoMedioNegociacaoDias !== null
              ? `${data.kpisCronologicos.comercial.tempoMedioNegociacaoDias.toFixed(1)} dias`
              : "—"
          }
          hint={
            data.kpisCronologicos.comercial.amostrasNegociacao > 0
              ? `média de ${data.kpisCronologicos.comercial.amostrasNegociacao} empreendimento(s)`
              : "ainda sem dado suficiente"
          }
          tone="primary"
          icon={ArrowRight}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Meu funil</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <BarrasHorizontais data={funil} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {proximosMovimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum empreendimento ativo.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {proximosMovimentos.map((e) => (
                  <Link
                    key={e.id}
                    href={`/empreendimentos/${e.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {e.nome}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {e.clienteNome}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={e.status} />
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
