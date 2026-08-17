"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, Factory, ListChecks, PackageSearch, ShieldAlert, Users, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/features/dashboard/components/kpi";
import type { DashboardData } from "@/features/dashboard/lib/queries";
import { EngenhariaPacoteAcoes } from "@/features/analytics/components/engenharia-pacote-actions";
import { cn } from "@/lib/utils";

const ABAS = [
  ["operacional", "Central Operacional"],
  ["engenharia", "Engenharia"],
  ["aprovacao", "Orçamentação"],
  ["negociacao", "Negociação"],
  ["suprimentos", "Suprimentos"],
  ["producao", "Produção & Expedição"],
  ["performance", "Performance"],
] as const;
type Aba = (typeof ABAS)[number][0];

function Badge({ nivel }: { nivel: "ALTA" | "MEDIA" | "BAIXA" }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", nivel === "ALTA" ? "bg-destructive/10 text-destructive" : nivel === "MEDIA" ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground")}>{nivel}</span>;
}

function TabelaFila({ fila }: { fila: DashboardData["analytics"]["coordenacao"]["fila"] }) {
  if (fila.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma exceção operacional relevante agora.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left">Empreendimento</th><th className="text-left">Área</th><th className="text-left">Problema / próxima ação</th><th className="text-left">Responsável</th><th className="text-right">Tempo</th><th className="text-right">Prioridade</th></tr></thead><tbody className="divide-y divide-border/60">{fila.map((r)=><tr key={r.id}><td className="py-2"><Link href={r.href} className="font-semibold hover:text-primary">{r.empreendimentoNome}</Link></td><td>{r.area}</td><td><p className="font-medium">{r.titulo}</p><p className="max-w-md text-[11px] text-muted-foreground">{r.detalhe}</p></td><td>{r.responsavel ?? "—"}</td><td className="text-right tabular-nums">{r.dias == null ? "—" : `${r.dias}d`}</td><td className="text-right"><Badge nivel={r.severidade}/></td></tr>)}</tbody></table></div>;
}

export function ViewCoordenador({ data }: { data: DashboardData }) {
  const a = data.analytics;
  const [aba, setAba] = React.useState<Aba>("operacional");
  return <div className="flex flex-col gap-5">
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">{ABAS.map(([id,label])=><button key={id} onClick={()=>setAba(id)} className={cn("whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium", aba===id?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-secondary")}>{label}</button>)}</div>

    {aba === "operacional" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Pendências críticas" value={a.coordenacao.criticos} hint={`${a.riscos.length} alertas totais`} icon={ShieldAlert} tone={a.coordenacao.criticos ? "danger" : "success"}/>
        <KpiCard label="Fora do SLA" value={a.coordenacao.foraSla} hint="Engenharia / Orçamentação" icon={Clock3} tone={a.coordenacao.foraSla ? "warning" : "success"}/>
        <KpiCard label="Bloqueios operacionais" value={a.coordenacao.bloqueios} hint="Suprimentos / Produção / Expedição" icon={PackageSearch} tone={a.coordenacao.bloqueios ? "warning" : "success"}/>
        <KpiCard label="Follow-ups vencidos" value={a.negociacao.followupsVencidos} hint="Negociação" icon={AlertTriangle} tone={a.negociacao.followupsVencidos ? "danger" : "success"}/>
        <KpiCard label="Remessas atrasadas" value={a.expedicao.remessasAtrasadas} hint="saída prevista vencida" icon={Factory} tone={a.expedicao.remessasAtrasadas ? "danger" : "success"}/>
      </div>
      <Card><CardHeader className="border-b border-border"><CardTitle className="text-[15px]">Fila operacional — o que precisa de ação</CardTitle><p className="text-xs text-muted-foreground">Ordenada por severidade e tempo. Clique no empreendimento para atuar.</p></CardHeader><CardContent className="pt-4"><TabelaFila fila={a.coordenacao.fila}/></CardContent></Card>
    </>}

    {aba === "engenharia" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Pacotes em aberto" value={a.engenharia.backlog} hint={`${a.engenharia.complexidadeBacklog} pts de carga`} icon={Wrench} tone="primary"/>
        <KpiCard label="Bloqueados" value={a.engenharia.bloqueados} hint="bloqueio explícito" icon={ShieldAlert} tone={a.engenharia.bloqueados ? "danger" : "success"}/>
        <KpiCard label="Fora do SLA" value={a.engenharia.foraSla} icon={Clock3} tone={a.engenharia.foraSla?"warning":"success"}/>
        <KpiCard label="Entregues · 30d" value={a.engenharia.validados30d} icon={ListChecks} tone="success"/>
        <KpiCard label="Lead médio" value={a.engenharia.leadTimeMedioDias==null?"—":`${a.engenharia.leadTimeMedioDias}d`} hint={`n=${a.engenharia.amostrasLeadTime}`} icon={Clock3}/>
        <KpiCard label="First Pass Yield" value={a.engenharia.firstPassYieldPct==null?"—":`${a.engenharia.firstPassYieldPct}%`} hint={`n=${a.engenharia.firstPassYieldAmostras} pós-instrumentação`} icon={ListChecks}/>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardContent className="pt-4"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left">Engenheiro</th><th className="text-left">Disciplinas</th><th className="text-right">WIP</th><th className="text-right">Carga pts</th><th className="text-right">Entregue pts</th><th className="text-right">Bloq.</th><th className="text-right">Qualidade</th><th className="text-right">No SLA</th></tr></thead><tbody className="divide-y divide-border/60">{a.engenharia.porPessoa.map((p)=><tr key={p.usuarioId}><td className="py-2 font-medium">{p.nome}</td><td>{p.disciplinas.join(" + ")}</td><td className="text-right">{p.wip}</td><td className="text-right font-semibold">{p.backlogPontos}</td><td className="text-right font-semibold">{p.entreguePontos}</td><td className="text-right">{p.pacotesBloqueados}</td><td className="text-right">{p.qualidadePct==null?"—":`${p.qualidadePct}%`}</td><td className="text-right">{p.noPrazoPct==null?"—":`${p.noPrazoPct}%`}</td></tr>)}</tbody></table></div></CardContent>
        </Card>
          <CardContent className="pt-4"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left">Engenheiro</th><th className="text-left">Disciplina</th><th className="text-right">WIP</th><th className="text-right">Carga pts</th><th className="text-right">Entregue pts</th><th className="text-right">Bloq.</th><th className="text-right">Qualidade</th><th className="text-right">No SLA</th></tr></thead><tbody className="divide-y divide-border/60">{a.engenharia.porPessoa.map((p)=><tr key={`${p.usuarioId}-${p.disciplina}`}><td className="py-2 font-medium">{p.nome}</td><td>{p.disciplina}</td><td className="text-right">{p.wip}</td><td className="text-right font-semibold">{p.backlogPontos}</td><td className="text-right font-semibold">{p.entreguePontos}</td><td className="text-right">{p.pacotesBloqueados}</td><td className="text-right">{p.qualidadePct==null?"—":`${p.qualidadePct}%`}</td><td className="text-right">{p.noPrazoPct==null?"—":`${p.noPrazoPct}%`}</td></tr>)}</tbody></table></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b"><CardTitle className="text-[15px]">Capacidade observada × backlog</CardTitle><p className="text-xs text-muted-foreground">Ritmo dos últimos 30 dias comparado à carga aberta. Não é previsão de contratação futura.</p></CardHeader>
          <CardContent className="space-y-3 pt-4">{a.engenharia.capacidadePorDisciplina.map((d)=><div key={d.disciplina} className="rounded-md border border-border p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold">{d.disciplina}</span><span className="text-[10px] text-muted-foreground">{d.pacotesEntregues30d} entregues</span></div><div className="mt-2 grid grid-cols-2 gap-2"><div><p className="text-[10px] text-muted-foreground">Ritmo 30d</p><p className="text-lg font-bold">{d.capacidadeObservada30dPontos} pts</p></div><div><p className="text-[10px] text-muted-foreground">Backlog</p><p className="text-lg font-bold">{d.backlogAtualPontos} pts</p></div></div><p className="mt-1 text-[11px] text-muted-foreground">Cobertura no ritmo atual: {d.coberturaBacklogMeses==null?"sem base":`${d.coberturaBacklogMeses} mês(es)`}</p></div>)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-[15px]">Fila de Engenharia — gestão do pacote</CardTitle><p className="text-xs text-muted-foreground">A unidade gerencial é levantamento por disciplina/tipologia. Atribua executor, prazo e registre bloqueios sem timesheet.</p></CardHeader>
        <CardContent className="pt-4"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left">Empreendimento / tipologia</th><th className="text-left">Disciplina</th><th className="text-left">Executor</th><th className="text-right">Complex.</th><th className="text-right">Lead</th><th className="text-left">Situação</th><th className="text-left">Gestão</th></tr></thead><tbody className="divide-y divide-border/60">{a.engenharia.pacotesAbertos.map((p)=><tr key={p.id} className={p.bloqueado?"bg-warning/5":""}><td className="py-2"><Link href={`/empreendimentos/${p.empreendimentoId}`} className="font-semibold hover:text-primary">{p.empreendimentoNome}</Link><p className="text-[10px] text-muted-foreground">{p.tipologia} · {p.escopo}</p></td><td>{p.disciplina}</td><td>{p.executorNome}</td><td className="text-right font-semibold">{p.complexidade}</td><td className="text-right">{p.leadTimeDiasUteis}d</td><td>{p.bloqueado?<><span className="font-semibold text-warning">Bloqueado</span><p className="max-w-xs text-[10px] text-muted-foreground">{p.motivoBloqueio} · {p.bloqueadoHoras}h</p></>:p.dentroSla===false?<span className="font-semibold text-warning">Fora do SLA</span>:<span className="text-muted-foreground">Em andamento</span>}</td><td><EngenhariaPacoteAcoes pacote={p} executores={a.engenharia.executoresDisponiveis}/></td></tr>)}</tbody></table>{a.engenharia.pacotesAbertos.length===0?<p className="py-8 text-center text-sm text-muted-foreground">Nenhum pacote de Engenharia em aberto.</p>:null}</div></CardContent>
      </Card>
    </>}

    {aba === "aprovacao" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Em elaboração" value={a.orcamentacao.emElaboracao} icon={ListChecks}/><KpiCard label="Aguardando gestor" value={a.orcamentacao.aguardandoGestor} icon={Clock3} tone={a.orcamentacao.aguardandoGestor?"warning":"success"}/><KpiCard label="Devolvidos · 30d" value={a.orcamentacao.devolvidos30d} icon={AlertTriangle}/><KpiCard label="Aprovados · 30d" value={a.orcamentacao.aprovados30d} icon={ListChecks} tone="success"/></div>
      <Card><CardContent className="pt-5"><TabelaFila fila={a.coordenacao.fila.filter((r)=>r.area==="ORCAMENTACAO")}/></CardContent></Card>
    </>}

    {aba === "negociacao" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Negociações abertas" value={a.negociacao.abertas} hint="carteira em tratativa" icon={Users} tone="primary"/>
        <KpiCard label="Follow-ups vencidos" value={a.negociacao.followupsVencidos} hint="ação comercial vencida" icon={AlertTriangle} tone={a.negociacao.followupsVencidos?"danger":"success"}/>
        <KpiCard label="Sem interação > 7d" value={a.negociacao.semInteracao7d} hint="risco de esfriamento" icon={Clock3} tone={a.negociacao.semInteracao7d?"warning":"success"}/>
        <KpiCard label="Desconto médio" value={a.negociacao.descontoMedioPct==null?"—":`${a.negociacao.descontoMedioPct}%`} hint="posição atual vs. base" icon={ListChecks}/>
      </div>
      <Card><CardHeader className="border-b"><CardTitle className="text-[15px]">Pendências de negociação</CardTitle><p className="text-xs text-muted-foreground">Follow-ups vencidos e negociações sem avanço entram na fila operacional.</p></CardHeader><CardContent className="pt-5"><TabelaFila fila={a.coordenacao.fila.filter((r)=>r.area==="NEGOCIACAO")}/></CardContent></Card>
    </>}

    {aba === "suprimentos" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Pedidos abertos" value={a.suprimentos.pedidosAbertos} icon={PackageSearch}/><KpiCard label="Pedidos atrasados" value={a.suprimentos.pedidosAtrasados} icon={AlertTriangle} tone={a.suprimentos.pedidosAtrasados?"danger":"success"}/><KpiCard label="Itens pendentes" value={a.suprimentos.itensPendentesRecebimento} icon={PackageSearch}/><KpiCard label="Cotações sem resposta" value={a.suprimentos.cotacoesSemResposta} icon={Clock3} tone={a.suprimentos.cotacoesSemResposta?"warning":"success"}/></div>
      <Card><CardContent className="pt-5"><TabelaFila fila={a.coordenacao.fila.filter((r)=>r.area==="SUPRIMENTOS")}/></CardContent></Card>
    </>}

    {aba === "producao" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><KpiCard label="OPs em andamento" value={a.producao.ordensEmAndamento} icon={Factory}/><KpiCard label="OPs pausadas" value={a.producao.ordensPausadas} icon={Clock3}/><KpiCard label="OPs atrasadas" value={a.producao.ordensAtrasadas} icon={AlertTriangle} tone={a.producao.ordensAtrasadas?"danger":"success"}/><KpiCard label="Remessas abertas" value={a.expedicao.remessasAbertas} icon={Factory}/><KpiCard label="Remessas atrasadas" value={a.expedicao.remessasAtrasadas} icon={AlertTriangle} tone={a.expedicao.remessasAtrasadas?"danger":"success"}/></div>
      <Card><CardContent className="pt-5"><TabelaFila fila={a.coordenacao.fila.filter((r)=>["PRODUCAO","EXPEDICAO"].includes(r.area))}/></CardContent></Card>
    </>}

    {aba === "performance" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Engenharia · carga" value={`${a.engenharia.complexidadeBacklog} pts`} hint={`${a.engenharia.backlog} pacotes`} icon={Users}/><KpiCard label="Produção · 30d" value={`${Math.round(a.producao.uh30d)} UH`} icon={Factory}/><KpiCard label="Retrabalho" value={a.producao.retrabalho} hint={`${a.producao.perdas} perdas`} icon={Wrench}/><KpiCard label="Tempo parado" value={`${a.producao.tempoParadoHoras30d}h`} hint="últimos 30 dias" icon={Clock3}/></div>
      <Card><CardHeader className="border-b"><CardTitle className="text-[15px]">Leitura correta da performance</CardTitle></CardHeader><CardContent className="space-y-2 pt-4 text-sm"><p><b>Engenharia:</b> throughput ponderado por complexidade e disciplina; executor e validador são papéis separados.</p><p><b>Produção:</b> U.H. equivalente continua sendo a moeda comum entre bancadas.</p><p className="text-muted-foreground">Bloqueios da Engenharia agora são instrumentados por eventos de bloquear/retomar. Tempo ativo continua indisponível até existir calendário de turnos/atividade suficiente para não inventar horas.</p></CardContent></Card>
    </>}
  </div>;
}
