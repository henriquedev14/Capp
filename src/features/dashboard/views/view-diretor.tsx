"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Factory,
  Gauge,
  PackageCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard, formatBRLCompacto } from "@/features/dashboard/components/kpi";
import { PipelineExecutivoChart, BarrasSimples, FluxoExpedicaoChart } from "@/features/analytics/components/analytics-charts";
import { AnalyticsDrilldownDrawer } from "@/features/analytics/components/analytics-drilldown-drawer";
import type { DashboardData } from "@/features/dashboard/lib/queries";
import { cn } from "@/lib/utils";

const ABAS = [
  ["executivo", "Visão Executiva"],
  ["pipeline", "Pipeline"],
  ["engenharia", "Engenharia"],
  ["negociacao", "Negociação"],
  ["suprimentos", "Suprimentos"],
  ["producao", "Produção & Expedição"],
  ["financeiro", "Financeiro"],
  ["riscos", "Riscos"],
] as const;
type Aba = (typeof ABAS)[number][0];

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-[15px]">{titulo}</CardTitle>
        {descricao ? <p className="text-xs text-muted-foreground">{descricao}</p> : null}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "danger" | "warning" | "success" }) {
  const cls = tone === "danger" ? "bg-destructive/10 text-destructive" : tone === "warning" ? "bg-warning/10 text-warning" : tone === "success" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>{children}</span>;
}

export function ViewDiretor({ data }: { data: DashboardData; metasPorArea?: unknown }) {
  const a = data.analytics;
  const [aba, setAba] = React.useState<Aba>("executivo");
  const [drilldownAberto, setDrilldownAberto] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {ABAS.map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)} className={cn("whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors", aba === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>{label}</button>
        ))}
      </div>

      {aba === "executivo" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Carteira ativa" value={a.carteira.ativos} hint={`${a.carteira.legadosAtivos} legado(s)`} icon={Building2} tone="primary" onClick={() => setDrilldownAberto("carteira-ativa")} />
          <KpiCard label="Valor da carteira" value={formatBRLCompacto(a.carteira.valorCarteira)} hint={`${a.carteira.clientesAtivos} clientes ativos`} icon={BriefcaseBusiness} />
          <KpiCard label="Em produção" value={formatBRLCompacto(a.carteira.valorEmProducao)} hint={`${a.producao.ordensEmAndamento} OPs em andamento`} icon={Factory} tone="success" />
          <KpiCard label="Riscos críticos" value={a.coordenacao.criticos} hint={`${a.riscos.length} alertas totais`} icon={AlertTriangle} tone={a.coordenacao.criticos ? "danger" : "success"} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Secao titulo="Esteira executiva" descricao="Quantidade e valor atual por etapa. Legados entram somente nas etapas operacionais que realmente percorrem.">
            <PipelineExecutivoChart dados={a.pipeline} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {a.pipeline.map((p) => <div key={p.status} className="rounded-md bg-secondary/35 p-2.5"><div className="flex items-center justify-between"><span className="text-xs font-semibold">{p.label}</span>{p.foraSla > 0 ? <Pill tone="warning">{p.foraSla} fora SLA</Pill> : null}</div><p className="mt-1 text-lg font-bold tabular-nums">{p.quantidade}</p><p className="text-[11px] text-muted-foreground">{formatBRLCompacto(p.valor)} · aging {p.agingMedioDias ?? "—"}d</p></div>)}
            </div>
          </Secao>
          <Secao titulo="Radar de decisão" descricao="Exceções que mais merecem atenção agora.">
            <div className="flex flex-col gap-2">
              {a.riscos.slice(0, 7).map((r) => <Link href={r.href} key={r.id} className="rounded-lg border border-border p-3 hover:bg-secondary/30"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold">{r.empreendimentoNome}</span><Pill tone={r.severidade === "ALTA" ? "danger" : r.severidade === "MEDIA" ? "warning" : "default"}>{r.area}</Pill></div><p className="mt-1 text-xs text-foreground">{r.titulo}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{r.detalhe}</p></Link>)}
              {a.riscos.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum alerta objetivo identificado agora.</p> : null}
            </div>
          </Secao>
        </div>
      </>}

      {aba === "pipeline" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Em negociação" value={a.negociacao.abertas} hint={formatBRLCompacto(a.negociacao.valorAberto)} icon={TrendingUp} tone="primary" />
          <KpiCard label="Ganhos · 30 dias" value={a.comercial.ganhos30d} hint={formatBRLCompacto(a.comercial.valorGanho30d)} icon={PackageCheck} tone="success" />
          <KpiCard label="Perdidos · 30 dias" value={a.comercial.perdidos30d} hint={formatBRLCompacto(a.comercial.valorPerdido30d)} icon={AlertTriangle} tone={a.comercial.perdidos30d ? "warning" : "default"} />
          <KpiCard label="Conversão · 30 dias" value={a.comercial.taxaConversao30d == null ? "—" : `${a.comercial.taxaConversao30d}%`} hint="ganhos / decisões finais" icon={Gauge} />
        </div>
        <Secao titulo="Pipeline por etapa" descricao="Aging usa a entrada real na etapa quando existe evento de timeline; não usa data de edição como fechamento."><PipelineExecutivoChart dados={a.pipeline} /></Secao>
      </>}

      {aba === "engenharia" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Backlog" value={a.engenharia.backlog} hint={`${a.engenharia.complexidadeBacklog} pts ponderados`} icon={Wrench} tone="primary" />
          <KpiCard label="Validados · 30 dias" value={a.engenharia.validados30d} hint="pacotes, não empreendimentos" icon={PackageCheck} tone="success" />
          <KpiCard label="Bloqueados" value={a.engenharia.bloqueados} hint="bloqueio explícito" icon={AlertTriangle} tone={a.engenharia.bloqueados ? "danger" : "success"} />
          <KpiCard label="Fora do SLA" value={a.engenharia.foraSla} hint="dias úteis" icon={Clock3} tone={a.engenharia.foraSla ? "warning" : "success"} />
          <KpiCard label="Lead time médio" value={a.engenharia.leadTimeMedioDias == null ? "—" : `${a.engenharia.leadTimeMedioDias}d`} hint={`n=${a.engenharia.amostrasLeadTime}`} icon={Clock3} />
          <KpiCard label="First Pass Yield" value={a.engenharia.firstPassYieldPct == null ? "—" : `${a.engenharia.firstPassYieldPct}%`} hint={`n=${a.engenharia.firstPassYieldAmostras} pós-instrumentação`} icon={Gauge} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <Secao titulo="Carga ponderada por engenheiro" descricao="Executor explícito prevalece; validador não recebe crédito pelo trabalho executado.">
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left">Pessoa</th><th className="text-left">Disciplina</th><th className="text-right">WIP</th><th className="text-right">Backlog pts</th><th className="text-right">Entregue pts</th><th className="text-right">Bloq.</th><th className="text-right">Qualidade</th><th className="text-right">SLA</th></tr></thead><tbody className="divide-y divide-border/60">{a.engenharia.porPessoa.map((p) => <tr key={`${p.usuarioId}-${p.disciplina}`}><td className="py-2 font-medium">{p.nome}</td><td>{p.disciplina}</td><td className="text-right">{p.wip}</td><td className="text-right font-semibold">{p.backlogPontos}</td><td className="text-right font-semibold">{p.entreguePontos}</td><td className="text-right">{p.pacotesBloqueados}</td><td className="text-right">{p.qualidadePct == null ? "—" : `${p.qualidadePct}%`}</td><td className="text-right">{p.noPrazoPct == null ? "—" : `${p.noPrazoPct}%`}</td></tr>)}</tbody></table>{a.engenharia.porPessoa.length === 0 ? <p className="py-8 text-center text-muted-foreground">Sem pacotes atribuídos ainda.</p> : null}</div>
          </Secao>
          <Secao titulo="Capacidade observada × backlog" descricao="Ritmo ponderado dos últimos 30 dias frente à carga atual; não é previsão futura.">
            <div className="space-y-2">{a.engenharia.capacidadePorDisciplina.map((d)=><div key={d.disciplina} className="rounded-md border border-border p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold">{d.disciplina}</span><span className="text-[10px] text-muted-foreground">{d.pacotesEntregues30d} pacotes</span></div><div className="mt-2 grid grid-cols-2 gap-2"><div><p className="text-[10px] text-muted-foreground">Ritmo 30d</p><p className="text-lg font-bold">{d.capacidadeObservada30dPontos} pts</p></div><div><p className="text-[10px] text-muted-foreground">Backlog</p><p className="text-lg font-bold">{d.backlogAtualPontos} pts</p></div></div><p className="mt-1 text-[11px] text-muted-foreground">Cobertura: {d.coberturaBacklogMeses == null ? "sem base" : `${d.coberturaBacklogMeses} mês(es)`}</p></div>)}</div>
          </Secao>
        </div>
        <Secao titulo="Pacotes críticos em aberto" descricao="Bloqueios e violações de SLA vêm antes da complexidade. A pontuação é heurística v1 e deve ser calibrada com histórico real.">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{a.engenharia.pacotesCriticos.slice(0, 12).map((p) => <Link key={p.id} href={`/empreendimentos/${p.empreendimentoId}`} className="rounded-md border border-border p-2.5 hover:bg-secondary/30"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold">{p.empreendimentoNome} · {p.tipologia}</span><Pill tone={p.bloqueado || p.complexidade >= 80 ? "danger" : p.complexidade >= 60 ? "warning" : "default"}>{p.bloqueado ? "BLOQ." : `${p.complexidade}/100`}</Pill></div><p className="mt-1 text-[11px] text-muted-foreground">{p.disciplina} · {p.escopo} · {p.executorNome} · {p.leadTimeDiasUteis}d úteis</p>{p.bloqueado ? <p className="mt-1 text-[11px] text-warning">{p.motivoBloqueio} · {p.bloqueadoHoras}h</p> : null}</Link>)}</div>
        </Secao>
      </>}

      {aba === "negociacao" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Valor aberto" value={formatBRLCompacto(a.negociacao.valorAberto)} hint={`${a.negociacao.abertas} negociações`} icon={Banknote} tone="primary" onClick={() => setDrilldownAberto("valor-negociacao")} /><KpiCard label="Follow-ups vencidos" value={a.negociacao.followupsVencidos} hint="próxima ação atrasada" icon={Clock3} tone={a.negociacao.followupsVencidos ? "danger" : "success"}/><KpiCard label="Sem interação > 7d" value={a.negociacao.semInteracao7d} hint="carteira parada" icon={AlertTriangle} tone={a.negociacao.semInteracao7d ? "warning" : "success"} onClick={() => setDrilldownAberto("sem-interacao-7d")} /><KpiCard label="Desconto médio" value={a.negociacao.descontoMedioPct == null ? "—" : `${a.negociacao.descontoMedioPct}%`} hint="sobre valor original disponível" icon={TrendingUp}/></div>
        <Secao titulo="Perdas por motivo · 30 dias"><BarrasSimples dados={a.negociacao.motivosPerda.map((m) => ({ label: m.motivo, valor: m.valor }))} formato="moeda" /></Secao>
      </>}

      {aba === "suprimentos" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><KpiCard label="Pedidos abertos" value={a.suprimentos.pedidosAbertos} hint={formatBRLCompacto(a.suprimentos.valorPedidosAbertos)} icon={ShoppingCart}/><KpiCard label="Pedidos atrasados" value={a.suprimentos.pedidosAtrasados} hint="prazo vencido" icon={AlertTriangle} tone={a.suprimentos.pedidosAtrasados ? "danger" : "success"}/><KpiCard label="Itens pendentes" value={a.suprimentos.itensPendentesRecebimento} hint="recebimento parcial/pendente" icon={PackageCheck}/><KpiCard label="Cotações sem resposta" value={a.suprimentos.cotacoesSemResposta} hint="> 5 dias" icon={Clock3} tone={a.suprimentos.cotacoesSemResposta ? "warning" : "success"}/><KpiCard label="Material → produção" value={a.suprimentos.tempoMedioMaterialAteProducaoDias == null ? "—" : `${a.suprimentos.tempoMedioMaterialAteProducaoDias}d`} hint="dias úteis médios" icon={Factory}/></div>
      </>}

      {aba === "producao" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><KpiCard label="OPs em andamento" value={a.producao.ordensEmAndamento} icon={Factory} tone="primary"/><KpiCard label="OPs atrasadas" value={a.producao.ordensAtrasadas} icon={AlertTriangle} tone={a.producao.ordensAtrasadas ? "danger" : "success"}/><KpiCard label="Produção · 30d" value={`${Math.round(a.producao.uh30d)} UH`} hint="UH equivalente" icon={Gauge}/><KpiCard label="Retrabalho" value={a.producao.retrabalho} hint={`${a.producao.perdas} perdas`} icon={Wrench}/><KpiCard label="Tempo parado · 30d" value={`${a.producao.tempoParadoHoras30d}h`} icon={Clock3} tone={a.producao.tempoParadoHoras30d > 0 ? "warning" : "success"}/></div>
        <div className="grid gap-4 xl:grid-cols-2"><Secao titulo="Motivos de parada"><BarrasSimples dados={a.producao.motivosParada.map((m) => ({ label: m.motivo, valor: m.horas }))} formato="horas" /></Secao><Secao titulo="Fluxo físico de Expedição" descricao="Previsto não é tratado como expedido."><FluxoExpedicaoChart dados={[{label:"Previsto",valor:a.expedicao.quantidadePrevista},{label:"Separado",valor:a.expedicao.quantidadeSeparada},{label:"Conferido",valor:a.expedicao.quantidadeConferida},{label:"Carregado",valor:a.expedicao.quantidadeCarregada},{label:"Expedido",valor:a.expedicao.quantidadeExpedida}]} /></Secao></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Remessas abertas" value={a.expedicao.remessasAbertas} icon={Truck}/><KpiCard label="Remessas parciais" value={a.expedicao.remessasParciais} icon={Truck}/><KpiCard label="Remessas atrasadas" value={a.expedicao.remessasAtrasadas} icon={AlertTriangle} tone={a.expedicao.remessasAtrasadas ? "danger" : "success"}/><KpiCard label="Legado · contratado" value={a.producao.legadoContratado} hint={`${a.producao.legadoEntregueHistorico + a.producao.legadoEntregueErp} entregues (${a.producao.legadoEntregueHistorico} pré-ERP)`} icon={PackageCheck}/></div>
      </>}

      {aba === "financeiro" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><KpiCard label="Valor contratado" value={formatBRLCompacto(a.financeiro.valorContratado)} icon={BriefcaseBusiness}/><KpiCard label="Títulos gerados" value={formatBRLCompacto(a.financeiro.titulosGerados)} hint="não equivale a faturamento formal" icon={Banknote}/><KpiCard label="Recebido" value={formatBRLCompacto(a.financeiro.recebido)} hint={`${formatBRLCompacto(a.financeiro.recebidoHistoricoLegado)} histórico legado`} icon={TrendingUp} tone="success"/><KpiCard label="Em aberto" value={formatBRLCompacto(a.financeiro.emAberto)} icon={Clock3}/><KpiCard label="Vencido" value={formatBRLCompacto(a.financeiro.vencido)} hint={`${a.financeiro.vencidosQuantidade} título(s)`} icon={AlertTriangle} tone={a.financeiro.vencido ? "danger" : "success"}/></div>
        <div className="grid gap-4 xl:grid-cols-2"><Secao titulo="Aging dos vencidos"><BarrasSimples dados={a.financeiro.aging.map((x)=>({label:x.faixa,valor:x.valor}))} formato="moeda"/></Secao><Secao titulo="Qualidade do dado financeiro"><div className="space-y-3 text-sm"><p><b>Faturamento pós-ERP:</b> <Pill tone="warning">indisponível</Pill></p><p className="text-xs text-muted-foreground">ContaReceber hoje é título/previsão. O Analytics não chama isso de faturamento real.</p><p><b>Faturado histórico Legado:</b> {formatBRLCompacto(a.financeiro.faturadoHistoricoLegado)}</p><p><b>Recebimento parcial:</b> não suportado pelo modelo atual.</p></div></Secao></div>
      </>}

      {aba === "riscos" && <Secao titulo={`Central de Riscos · ${a.riscos.length}`} descricao="Alertas objetivos, com origem e drill-down. Sem score arbitrário."><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left">Empreendimento</th><th className="text-left">Área</th><th className="text-left">Risco</th><th className="text-left">Responsável</th><th className="text-right">Severidade</th></tr></thead><tbody className="divide-y divide-border/60">{a.riscos.map((r)=><tr key={r.id}><td className="py-2"><Link href={r.href} className="font-medium hover:text-primary">{r.empreendimentoNome}</Link></td><td>{r.area}</td><td><p className="font-medium">{r.titulo}</p><p className="text-[11px] text-muted-foreground">{r.detalhe}</p></td><td>{r.responsavel ?? "—"}</td><td className="text-right"><Pill tone={r.severidade === "ALTA" ? "danger" : r.severidade === "MEDIA" ? "warning" : "default"}>{r.severidade}</Pill></td></tr>)}</tbody></table></div></Secao>}

      <AnalyticsDrilldownDrawer
        metricKey={drilldownAberto ?? ""}
        filtros={{}}
        aberto={drilldownAberto != null}
        onFechar={() => setDrilldownAberto(null)}
      />
    </div>
  );
}
