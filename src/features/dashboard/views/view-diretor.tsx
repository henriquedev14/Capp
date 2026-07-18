"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowRight,
  Wallet,
  Factory,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/features/empreendimentos/components/status-badge";
import { KpiCard, formatBRL, formatBRLCompacto, calcularDelta } from "@/features/dashboard/components/kpi";
import { GraficoLucroReal, GraficoReceitaPrevista, GraficoPipeline, GraficoCustoFixoVariavel } from "@/features/dashboard/components/charts";
import type { DashboardData } from "@/features/dashboard/lib/queries";

// Cores dos status de empreendimento — mesmas do StatusBadge, importadas
// como HEX pra usar direto na BarrasHorizontais (SVG não pega classe Tailwind).
const CORES_STATUS: Record<string, string> = {
  PROSPECCAO: "#94a3b8",
  COMERCIAL: "#f59e0b",
  ORCAMENTACAO: "#3b82f6",
  NEGOCIACAO: "#8b5cf6",
  CONTRATADO: "#22c55e",
  SUPRIMENTOS: "#a855f7",
  PRODUCAO: "#ec4899",
  CONCLUIDO: "#10b981",
  ARQUIVADO: "#64748b",
};

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

import type { MetasPorArea } from "@/features/financeiro/actions/cadastros-actions";
import { MetasAreasEditor } from "@/features/dashboard/components/metas-areas-editor";

export function ViewDiretor({ data, metasPorArea }: { data: DashboardData; metasPorArea: MetasPorArea }) {
  const router = useRouter();
  // Pipeline = valor total dos orçamentos em fluxo ativo (não aprovado/arquivado)
  const orcamentosAtivos = data.orcamentos.filter(
    (o) =>
      o.status === "EM_LEVANTAMENTO" ||
      o.status === "ENVIADO_APROVACAO_GESTOR" ||
      o.status === "ORCAMENTO_DEVOLVIDO"
  );
  const valorEmPipeline = orcamentosAtivos.reduce((s, o) => s + o.totalGeral, 0);

  // Taxa de aprovação do mês corrente
  const orcamentosFinalizadosMes = data.orcamentos.filter((o) => {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    return (
      o.atualizadoEm >= inicioMes &&
      (o.status === "ORCAMENTO_APROVADO" || o.status === "ORCAMENTO_DEVOLVIDO")
    );
  });
  const aprovadosMes = orcamentosFinalizadosMes.filter(
    (o) => o.status === "ORCAMENTO_APROVADO"
  ).length;
  const taxaAprovacao =
    orcamentosFinalizadosMes.length > 0
      ? (aprovadosMes / orcamentosFinalizadosMes.length) * 100
      : 0;

  const deltaFechado = calcularDelta(data.mes.valorFechado, data.mes.valorFechadoMesAnterior);

  // Resultado de Caixa = movimentação de caixa de verdade (contas baixadas), não
  // orçamento fechado — dois números diferentes de propósito. "Fechado"
  // pode não ter sido pago ainda; não é lucro contábil, é dinheiro que já entrou/saiu.
  const lucroRealMes = data.financeiro.recebidoMes - data.financeiro.pagoMes;
  const lucroRealMesAnterior = data.financeiro.recebidoMesAnterior - data.financeiro.pagoMesAnterior;
  const deltaLucroReal = calcularDelta(lucroRealMes, lucroRealMesAnterior);

  // Empreendimentos ativos por status (para as barras de pipeline)
  const distribuicaoStatus = Object.keys(LABELS_STATUS).map((s) => ({
    label: LABELS_STATUS[s] ?? s,
    value: data.empreendimentos.filter((e) => e.status === s).length,
    color: CORES_STATUS[s] ?? "#94a3b8",
    status: s,
  }));

  // Funil comercial com % de conversão — cumulativo: conta quantos
  // empreendimentos chegaram NAQUELA etapa OU MAIS ADIANTE no fluxo
  // (aproximação pelo status atual, não histórico completo de Timeline —
  // simples de calcular e já dá o essencial: onde a maior parte do
  // volume está sendo perdida entre uma etapa e a próxima).
  const ORDEM_FUNIL = ["PROSPECCAO", "COMERCIAL", "ORCAMENTACAO", "NEGOCIACAO", "CONTRATADO"];
  const naoArquivados = data.empreendimentos.filter((e) => e.status !== "ARQUIVADO");
  const funilComercial = ORDEM_FUNIL.map((status, idx) => {
    const chegaramAteAqui = naoArquivados.filter((e) => {
      const idxAtual = ORDEM_FUNIL.indexOf(e.status);
      // Se o status atual não está na lista do funil (ex: já passou pra
      // SUPRIMENTOS/PRODUCAO/CONCLUIDO), conta como "chegou até o fim".
      return idxAtual === -1 ? true : idxAtual >= idx;
    }).length;
    return { status, label: LABELS_STATUS[status] ?? status, quantidade: chegaramAteAqui };
  });
  const baseFunil = funilComercial[0]?.quantidade ?? 0;

  // Top 5 empreendimentos por valor de orçamento (soma das revisões ativas)
  const empPorValor = new Map<string, { nome: string; valor: number; status: string }>();
  data.orcamentos.forEach((o) => {
    if (o.status === "ARQUIVADO") return;
    const emp = data.empreendimentos.find((e) => e.id === o.empreendimentoId);
    if (!emp) return;
    const existing = empPorValor.get(o.empreendimentoId);
    // Pega a maior revisão ativa por empreendimento — evita somar revisões
    if (!existing || o.totalGeral > existing.valor) {
      empPorValor.set(o.empreendimentoId, {
        nome: emp.nome,
        valor: o.totalGeral,
        status: emp.status,
      });
    }
  });
  const top5 = Array.from(empPorValor.entries())
    .sort(([, a], [, b]) => b.valor - a.valor)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Decisões que exigem atenção — antes era um alerta simples com
          pills; agora cada item mostra o motivo e o valor envolvido, não
          só "X pendências". Máximo 5, as mais importantes primeiro. */}
      {(() => {
        const decisoes: { titulo: string; detalhe: string; href: string }[] = [];
        if (data.financeiro.contasPagarVencidas.quantidade > 0) {
          decisoes.push({
            titulo: `${data.financeiro.contasPagarVencidas.quantidade} conta(s) a pagar vencida(s)`,
            detalhe: `${formatBRL(data.financeiro.contasPagarVencidas.valorTotal)} em atraso — risco de juros/multa e de travar fornecedor.`,
            href: "/financeiro/contas-a-pagar",
          });
        }
        if (data.paradosSemAtualizacao.length > 0) {
          decisoes.push({
            titulo: `${data.paradosSemAtualizacao.length} orçamento(s) parado(s) há mais de 7 dias`,
            detalhe: "Sem atualização recente — pode estar esquecido, sem dono, ou esperando decisão de alguém.",
            href: "#alertas-parados",
          });
        }
        if (data.cotacoesSemResposta.length > 0) {
          decisoes.push({
            titulo: `${data.cotacoesSemResposta.length} cotação(ões) sem resposta do fornecedor há +5 dias`,
            detalhe: "Pode atrasar o início de Suprimentos/Produção se ninguém cobrar o fornecedor.",
            href: "#alertas-cotacoes",
          });
        }
        if (data.financeiro.inadimplencia.quantidade > 0) {
          decisoes.push({
            titulo: `${data.financeiro.inadimplencia.quantidade} recebimento(s) vencido(s) sem confirmação`,
            detalhe: `${formatBRL(data.financeiro.inadimplencia.valorTotal)} vencido — verificar se caiu na conta antes de virar inadimplência real.`,
            href: "/financeiro/contas-a-receber",
          });
        }
        const orcamentosAguardandoAprovacao = data.orcamentos.filter((o) => o.status === "ENVIADO_APROVACAO_GESTOR");
        if (orcamentosAguardandoAprovacao.length > 0) {
          decisoes.push({
            titulo: `${orcamentosAguardandoAprovacao.length} orçamento(s) aguardando sua aprovação`,
            detalhe: orcamentosAguardandoAprovacao.map((o) => o.empreendimentoNome).join(", "),
            href: "/orcamentacao?visao=aguardando_aprovacao",
          });
        }
        if (decisoes.length === 0) return null;
        return (
          <Card className="border-l-4 border-l-warning">
            <CardContent className="flex flex-col gap-2 pt-5">
              <div className="mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                  Decisões que exigem atenção
                </h2>
              </div>
              {decisoes.slice(0, 5).map((d, i) => (
                <Link
                  key={i}
                  href={d.href}
                  className="flex items-start gap-3 border-l-2 border-l-warning bg-warning/[0.03] px-3 py-2.5 hover:bg-warning/[0.06]"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{d.titulo}</p>
                    <p className="text-xs text-muted-foreground">{d.detalhe}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        );
      })()}

      {/* Situação geral — resumo executivo, no máximo 6 números, cada um
          com contexto. Antes eram 6 cards só de pipeline aqui em cima e
          MAIS 4 de caixa numa seção separada logo abaixo — misturado
          agora, porque pipeline sem caixa (ou vice-versa) é meia
          verdade sobre a saúde do negócio. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Saldo em caixa"
          value={formatBRLCompacto(data.financeiro.saldoCaixaAtual)}
          tone={data.financeiro.saldoCaixaAtual >= 0 ? "primary" : "danger"}
          icon={Wallet}
        />
        <KpiCard
          label="Resultado de Caixa no mês"
          value={formatBRLCompacto(lucroRealMes)}
          hint="recebido − pago (não é lucro contábil)"
          trend={{ delta: deltaLucroReal, label: "vs mês anterior" }}
          tone={lucroRealMes >= 0 ? "success" : "danger"}
          icon={lucroRealMes >= 0 ? TrendingUp : TrendingDown}
        />
        <KpiCard
          label="Valor contratado no mês"
          value={formatBRLCompacto(data.mes.valorFechado)}
          hint={`${data.mes.orcamentosFechados} contratado(s)`}
          trend={{ delta: deltaFechado, label: "vs mês anterior" }}
          tone="success"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Valor em pipeline"
          value={formatBRLCompacto(valorEmPipeline)}
          hint={`${orcamentosAtivos.length} orçamentos ativos`}
          tone="primary"
          icon={DollarSign}
        />
        <KpiCard
          label="Contas a pagar vencidas"
          value={data.financeiro.contasPagarVencidas.quantidade}
          hint={formatBRL(data.financeiro.contasPagarVencidas.valorTotal)}
          tone={data.financeiro.contasPagarVencidas.quantidade > 0 ? "danger" : "default"}
          icon={AlertTriangle}
        />
        <KpiCard
          label="Empreendimentos em risco"
          value={data.paradosSemAtualizacao.length + data.cotacoesSemResposta.length}
          hint="parados +7d ou cotação sem resposta +5d"
          tone={data.paradosSemAtualizacao.length + data.cotacoesSemResposta.length > 0 ? "warning" : "default"}
          icon={Clock}
        />
      </div>

      {/* ============================================================
          DESEMPENHO DAS ÁREAS — scorecard executivo. Antes cada área
          tinha o tempo médio dela num card solto em seções diferentes
          da página; agora é uma visão lado a lado, pra ver rápido qual
          área está seca de dado (amostra baixa) ou pesando o processo.
      ============================================================ */}
      {(() => {
        interface Area {
          nome: string;
          tempoDias: number | null;
          amostras: number;
          detalhe: string;
          meta: number | null;
        }
        const areas: Area[] = [
          {
            nome: "Comercial",
            tempoDias: data.kpisCronologicos.comercial.tempoMedioProspeccaoDias,
            amostras: data.kpisCronologicos.comercial.amostrasProspeccao,
            detalhe: "tempo médio em prospecção",
            meta: metasPorArea.comercial,
          },
          {
            nome: "Engenharia",
            tempoDias: data.kpisCronologicos.engenharia.tempoMedioDias,
            amostras: data.kpisCronologicos.engenharia.amostras,
            detalhe: "tempo médio de levantamento",
            meta: metasPorArea.engenharia,
          },
          {
            nome: "Orçamentação",
            tempoDias: data.kpisCronologicos.orcamentacao.tempoMedioDias,
            amostras: data.kpisCronologicos.orcamentacao.amostras,
            detalhe: "tempo médio de proposta",
            meta: metasPorArea.orcamentacao,
          },
          {
            nome: "Suprimentos/Produção",
            tempoDias: data.kpisCronologicos.producao.leadTimeTotalDias,
            amostras: data.kpisCronologicos.producao.amostras,
            detalhe: "lead time total",
            meta: metasPorArea.producao,
          },
        ];
        const LIMITE_AMOSTRA = 3;
        function statusDe(area: Area): { label: string; classe: string } {
          if (area.tempoDias === null || area.amostras < LIMITE_AMOSTRA) {
            return { label: "Sem dados suficientes", classe: "bg-muted text-muted-foreground" };
          }
          if (area.meta === null) {
            return { label: "Sem meta definida", classe: "bg-secondary text-muted-foreground" };
          }
          if (area.tempoDias <= area.meta) {
            return { label: "Saudável", classe: "bg-success/15 text-success" };
          }
          if (area.tempoDias <= area.meta * 1.3) {
            return { label: "Atenção", classe: "bg-warning/15 text-warning" };
          }
          return { label: "Crítico", classe: "bg-destructive/15 text-destructive" };
        }
        return (
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <CardTitle className="text-[15px]">Desempenho das áreas</CardTitle>
              <MetasAreasEditor metasIniciais={metasPorArea} />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {areas.map((area) => {
                  const status = statusDe(area);
                  return (
                    <div key={area.nome} className="rounded-lg border border-border p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{area.nome}</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                        {area.tempoDias !== null ? `${area.tempoDias.toFixed(1)}d` : "—"}
                        {area.meta !== null && area.tempoDias !== null && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">/ meta {area.meta}d</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{area.detalhe}</p>
                      <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${status.classe}`}>
                        {area.amostras < LIMITE_AMOSTRA
                          ? `${status.label} (${area.amostras} amostra${area.amostras === 1 ? "" : "s"})`
                          : status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Saúde financeira — puxado do módulo Financeiro (fluxo de caixa
          real: contas efetivamente baixadas), separado do funil comercial
          acima (que é sobre orçamento/negócio, não sobre dinheiro que já
          entrou ou saiu de verdade). */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Saúde financeira — detalhe</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {data.financeiro.inadimplencia.quantidade > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
              <span className="text-sm font-medium text-foreground">Inadimplência</span>
              <span className="text-sm font-semibold text-destructive">
                {formatBRLCompacto(data.financeiro.inadimplencia.valorTotal)} · {data.financeiro.inadimplencia.quantidade} conta(s)
              </span>
            </div>
          )}
          <div className="mt-1 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recebido × Pago × Resultado de Caixa — últimos 6 meses
            </p>
            <GraficoLucroReal dados={data.financeiro.lucroRealHistorico} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Receita prevista — próximos 6 meses, baseado no cronograma de
            Contas a Receber (entrada + remessas com data já definida). */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 border-b border-border">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Receita prevista (6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <GraficoReceitaPrevista dados={data.financeiro.receitaPrevista} />
            <p className="mt-3 text-xs text-muted-foreground">
              Projeção mensal (não semanal) — é a granularidade que o Contas a Receber sustenta hoje. Uma
              projeção semanal de 13 semanas exigiria detalhar vencimentos por semana, o que ainda não existe.
            </p>
          </CardContent>
        </Card>

        {/* Custo Fixo x Variável — proporção do que foi pago no mês, usando
            o tipo da Conta a Pagar (Fixa vs Avulsa/Parcelada) como proxy. */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 border-b border-border">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Custo Fixo × Variável (mês)</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <GraficoCustoFixoVariavel
              fixo={data.financeiro.custoFixoVsVariavel.fixo}
              variavel={data.financeiro.custoFixoVsVariavel.variavel}
            />
            <Link
              href="/financeiro/contas-a-pagar"
              className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver Contas a Pagar <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Produção/entrega — empreendimentos que já passaram da etapa
            comercial e estão fisicamente sendo produzidos/entregues. */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 border-b border-border">
            <Factory className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Em produção agora</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-2 pt-5 pb-6">
            <span className="text-4xl font-bold text-foreground">
              {data.producao.emAndamento.quantidade}
            </span>
            <span className="text-sm text-muted-foreground">empreendimento(s) em Suprimentos/Produção</span>
            <span className="mt-2 text-lg font-semibold text-primary">
              {formatBRL(data.producao.emAndamento.valorTotal)}
            </span>
            <span className="text-xs text-muted-foreground">valor total contratado em produção</span>
            <div className="mt-2 flex gap-4">
              <Link href="/empreendimentos?status=SUPRIMENTOS" className="text-xs font-medium text-primary hover:underline">
                Ver Suprimentos →
              </Link>
              <Link href="/empreendimentos?status=PRODUCAO" className="text-xs font-medium text-primary hover:underline">
                Ver Produção →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista das obras em produção — antes só tinha o número total, sem
          dizer QUAIS obras. Card sozinho com um número não ajuda o
          Operacional a agir; tabela com nome + status + valor, sim. */}
      {data.producao.lista.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Obras em Suprimentos/Produção</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Empreendimento</th>
                    <th className="px-3 py-2 text-left font-medium">Etapa</th>
                    <th className="px-3 py-2 text-right font-medium">Valor contratado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.producao.lista
                    .sort((a, b) => b.valor - a.valor)
                    .map((item) => (
                      <tr key={item.empreendimentoId} className="hover:bg-secondary/20">
                        <td className="px-3 py-2">
                          <Link
                            href={`/empreendimentos/${item.empreendimentoId}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {item.empreendimentoNome}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {item.status === "SUPRIMENTOS" ? "Suprimentos" : "Produção"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                          {formatBRL(item.valor)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gargalo por setor — compara os 4 tempos médios já calculados lado
          a lado, destacando o maior. Antes eram 4 cards soltos em telas
          diferentes, sem nenhuma comparação visual entre eles — dava pra
          saber "quanto tempo leva a Engenharia" mas não "qual setor está
          segurando mais o processo". */}
      {(() => {
        const setores = [
          { nome: "Comercial (prospecção)", dias: data.kpisCronologicos.comercial.tempoMedioProspeccaoDias },
          { nome: "Comercial (negociação)", dias: data.kpisCronologicos.comercial.tempoMedioNegociacaoDias },
          { nome: "Engenharia (levantamento)", dias: data.kpisCronologicos.engenharia.tempoMedioDias },
          { nome: "Orçamentação (proposta)", dias: data.kpisCronologicos.orcamentacao.tempoMedioDias },
          { nome: "Produção (lead time total)", dias: data.kpisCronologicos.producao.leadTimeTotalDias },
        ].filter((s): s is { nome: string; dias: number } => s.dias !== null);
        if (setores.length === 0) return null;
        const maior = Math.max(...setores.map((s) => s.dias));
        return (
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-[15px]">Gargalo por setor — tempo médio de cada etapa</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex flex-col gap-2.5">
                {setores
                  .sort((a, b) => b.dias - a.dias)
                  .map((s, idx) => (
                    <div key={s.nome} className="flex items-center gap-3">
                      <span className="w-48 shrink-0 text-xs text-muted-foreground">{s.nome}</span>
                      <div className="flex-1 rounded-md bg-secondary/40">
                        <div
                          className={`rounded-md py-1.5 text-right pr-2 text-xs font-medium transition-all ${
                            idx === 0 ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground"
                          }`}
                          style={{ width: `${Math.max((s.dias / maior) * 100, 12)}%` }}
                        >
                          {s.dias.toFixed(1)}d
                        </div>
                      </div>
                      {idx === 0 && (
                        <span className="shrink-0 text-xs font-medium text-warning">← gargalo atual</span>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Lead time de produção — quanto tempo cada fase física está
          levando, na média, do contrato assinado até a entrega. */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Lead time de produção</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              label="Tempo médio em Suprimentos"
              value={
                data.kpisCronologicos.producao.tempoMedioSuprimentosDias !== null
                  ? `${data.kpisCronologicos.producao.tempoMedioSuprimentosDias.toFixed(1)} dias`
                  : "—"
              }
              hint="Contratado → Produção"
              tone="default"
              icon={Clock}
            />
            <KpiCard
              label="Tempo médio em Produção"
              value={
                data.kpisCronologicos.producao.tempoMedioProducaoDias !== null
                  ? `${data.kpisCronologicos.producao.tempoMedioProducaoDias.toFixed(1)} dias`
                  : "—"
              }
              hint="Produção → Concluído"
              tone="default"
              icon={Clock}
            />
            <KpiCard
              label="Lead time total"
              value={
                data.kpisCronologicos.producao.leadTimeTotalDias !== null
                  ? `${data.kpisCronologicos.producao.leadTimeTotalDias.toFixed(1)} dias`
                  : "—"
              }
              hint={
                data.kpisCronologicos.producao.amostras > 0
                  ? `Contratado → Concluído · ${data.kpisCronologicos.producao.amostras} amostra(s)`
                  : "ainda sem dado suficiente"
              }
              tone="primary"
              icon={Clock}
            />
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de empreendimentos por status */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Pipeline por status</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <GraficoPipeline
            dados={distribuicaoStatus}
            onBarClick={(status) => router.push(`/empreendimentos?status=${status}`)}
          />
        </CardContent>
      </Card>

      {/* Funil comercial com % de conversão entre etapas — mostra onde o
          volume está sendo perdido, não só quantos estão em cada etapa. */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Funil comercial — conversão entre etapas</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {orcamentosFinalizadosMes.length < 5 ? (
            <p className="mb-4 rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              Taxa de aprovação indisponível como % confiável — amostra insuficiente ({orcamentosFinalizadosMes.length}{" "}
              orçamento(s) finalizado(s) esse mês). Aparece quando tiver pelo menos 5.
            </p>
          ) : (
            <p className="mb-4 flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2 text-sm">
              <span className="text-foreground">Taxa de aprovação no mês</span>
              <span className={`font-semibold ${taxaAprovacao >= 70 ? "text-success" : taxaAprovacao >= 50 ? "text-foreground" : "text-warning"}`}>
                {taxaAprovacao.toFixed(0)}% ({aprovadosMes} de {orcamentosFinalizadosMes.length})
              </span>
            </p>
          )}
          {baseFunil === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum empreendimento no funil ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Com poucos empreendimentos ativos, % de conversão é só
                  ruído estatístico (2 empreendimentos = só 3 valores
                  possíveis: 0%, 50%, 100% — nenhum deles significa nada).
                  Mostra a contagem sempre, mas só mostra % quando a base
                  tem uma amostra mínima que faz sentido comparar. */}
              {baseFunil < 5 && (
                <p className="mb-1 text-xs text-muted-foreground">
                  Só {baseFunil} empreendimento(s) ativo(s) no funil — % de conversão ainda não é confiável com uma amostra tão pequena. Mostrando só a contagem por enquanto.
                </p>
              )}
              {funilComercial.map((etapa, idx) => {
                const pctDoInicio = baseFunil > 0 ? (etapa.quantidade / baseFunil) * 100 : 0;
                const anterior = idx > 0 ? funilComercial[idx - 1] : null;
                const pctDaAnterior =
                  anterior && anterior.quantidade > 0 ? (etapa.quantidade / anterior.quantidade) * 100 : null;
                return (
                  <div key={etapa.status} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">{etapa.label}</span>
                    <div className="flex-1 rounded-md bg-secondary/40">
                      <div
                        className="rounded-md bg-primary py-1.5 text-right pr-2 text-xs font-medium text-primary-foreground transition-all"
                        style={{ width: `${Math.max(pctDoInicio, 8)}%` }}
                      >
                        {etapa.quantidade}
                      </div>
                    </div>
                    <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                      {baseFunil < 5
                        ? "—"
                        : idx === 0
                          ? "—"
                          : pctDaAnterior != null
                            ? `${pctDaAnterior.toFixed(0)}% da anterior`
                            : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top empreendimentos por valor — tabela com "heat map": a cor de
            fundo da célula de valor fica mais forte quanto mais próximo
            do maior valor do grupo, dá pra escanear visualmente onde está
            concentrado o valor sem ler número nenhum. */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 border-b border-border">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Top 5 por valor de orçamento</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Ordenado por valor contratado — não por margem. Rentabilidade real por obra (receita − custo
              realizado) ainda não está disponível: falta o rastreio de custo realizado por empreendimento
              no sistema. Quando existir, esse card passa a comparar por margem, não só por valor.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {top5.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem orçamentos ativos.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Empreendimento</th>
                      <th className="px-3 py-2 text-left font-medium">Etapa</th>
                      <th className="px-3 py-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {top5.map(([id, e]) => {
                      const maiorValor = top5[0]?.[1]?.valor ?? 1;
                      const intensidade = maiorValor > 0 ? e.valor / maiorValor : 0;
                      return (
                        <tr key={id} className="hover:bg-secondary/20">
                          <td className="px-3 py-2">
                            <Link
                              href={`/empreendimentos/${id}`}
                              className="font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {e.nome}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={e.status} />
                          </td>
                          <td
                            className="px-3 py-2 text-right font-semibold tabular-nums text-foreground"
                            style={{ backgroundColor: `hsl(var(--primary) / ${0.08 + intensidade * 0.22})` }}
                          >
                            {formatBRL(e.valor)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas: parados há +7 dias */}
        <Card id="alertas-parados">
          <CardHeader className="flex-row items-center gap-3 border-b border-border">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <CardTitle className="text-[15px]">
              Parados há +7 dias ({data.paradosSemAtualizacao.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {data.paradosSemAtualizacao.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum orçamento parado. Boa!
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.paradosSemAtualizacao.slice(0, 6).map((o) => {
                  const diasParado = Math.floor(
                    (Date.now() - new Date(o.atualizadoEm).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <Link
                      key={o.id}
                      href={`/empreendimentos/${o.empreendimentoId}/orcamento`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 transition-colors hover:bg-warning/10"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {o.empreendimentoNome}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {LABELS_STATUS_ORC[o.status] ?? o.status} · rev. {o.revisao}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-warning">
                        {diasParado}d
                        <ArrowRight className="ml-1 inline h-3 w-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas: cotações sem resposta há +5 dias */}
        <Card id="alertas-cotacoes">
          <CardHeader className="flex-row items-center gap-3 border-b border-border">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <CardTitle className="text-[15px]">
              Cotações sem resposta +5 dias ({data.cotacoesSemResposta.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {data.cotacoesSemResposta.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma cotação parada. Boa!</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.cotacoesSemResposta.slice(0, 6).map((c) => {
                  const diasParado = Math.floor(
                    (Date.now() - new Date(c.atualizadoEm).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <Link
                      key={c.id}
                      href={`/empreendimentos/${c.empreendimentoId}/orcamento`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 transition-colors hover:bg-warning/10"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {c.numero} — {c.fornecedorNome}
                        </span>
                        <span className="text-xs text-muted-foreground">{c.empreendimentoNome}</span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-warning">
                        {diasParado}d
                        <ArrowRight className="ml-1 inline h-3 w-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const LABELS_STATUS_ORC: Record<string, string> = {
  EM_LEVANTAMENTO: "Em levantamento",
  ENVIADO_APROVACAO_GESTOR: "Aguardando gestor",
  ORCAMENTO_APROVADO: "Aprovado",
  ORCAMENTO_DEVOLVIDO: "Devolvido",
};
