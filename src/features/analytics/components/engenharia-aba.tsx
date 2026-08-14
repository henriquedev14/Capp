"use client";

import * as React from "react";
import Link from "next/link";
import { Wrench, PackageCheck, AlertTriangle, Clock3, Gauge, ChevronDown, ChevronRight } from "lucide-react";
import { KpiCard } from "@/features/dashboard/components/kpi";
import type { AnalyticsData } from "@/features/analytics/lib/types";

const LABEL_DISC: Record<string, string> = { ELETRICA: "Elétrica", HIDRAULICA: "Hidráulica", MATERIAIS: "Materiais" };

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{titulo}</p>
      {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Pill({ tone, children }: { tone: "danger" | "warning" | "success" | "default"; children: React.ReactNode }) {
  const cls = {
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    default: "bg-secondary text-muted-foreground",
  }[tone];
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}

/**
 * Aba Engenharia — refeita em 6 blocos, operação antes de performance
 * histórica. Desenhado com o Henrique em 14/08/2026 (docs anexados na
 * conversa): "primeiro operação atual, depois performance".
 */
export function EngenhariaAba({
  a,
  setDrilldownAberto,
}: {
  a: AnalyticsData;
  setDrilldownAberto: (key: string) => void;
}) {
  const [pessoaExpandida, setPessoaExpandida] = React.useState<string | null>(null);
  const eng = a.engenharia;

  return (
    <>
      {/* Bloco 1 — Situação atual */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Em andamento" value={eng.backlog} hint="ainda não validado" icon={Wrench} tone="primary" onClick={() => setDrilldownAberto("engenharia-atrasados")} />
        <KpiCard label="Atrasados" value={eng.foraSla} hint="fora do SLA" icon={Clock3} tone={eng.foraSla ? "danger" : "success"} onClick={() => setDrilldownAberto("engenharia-atrasados")} />
        <KpiCard label="Bloqueados" value={eng.bloqueados} hint="bloqueio explícito" icon={AlertTriangle} tone={eng.bloqueados ? "danger" : "success"} onClick={() => setDrilldownAberto("engenharia-bloqueados")} />
        <KpiCard label="Carga aberta" value={`${eng.complexidadeBacklog} pts`} hint={`${eng.backlog} pacote(s)`} icon={Gauge} />
        <KpiCard label="Entregue · 30d" value={`${eng.entregue30dPontos} pts`} hint={`${eng.validados30d} pacote(s) validados`} icon={PackageCheck} tone="success" />
        <KpiCard label="Retrabalho · 30d" value={eng.retrabalhosObservados30d} hint="pacotes reabertos" icon={AlertTriangle} tone={eng.retrabalhosObservados30d ? "warning" : "success"} />
      </div>

      {/* Bloco 2 — Fila por disciplina */}
      <div className="grid gap-3 sm:grid-cols-3">
        {eng.capacidadePorDisciplina.map((d) => (
          <Secao key={d.disciplina} titulo={LABEL_DISC[d.disciplina] ?? d.disciplina}>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-muted-foreground">Carga aberta</p><p className="text-sm font-semibold">{d.backlogAtualPontos} pts</p></div>
              <div><p className="text-muted-foreground">Entregue 30d</p><p className="text-sm font-semibold">{d.capacidadeObservada30dPontos} pts</p></div>
            </div>
          </Secao>
        ))}
      </div>

      {/* Bloco 3 — Carga da equipe (1 linha por pessoa) */}
      <Secao titulo="Carga da equipe" descricao="Uma linha por pessoa — clique pra ver o detalhe por disciplina. Executor explícito prevalece; validador não recebe crédito pelo trabalho executado.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 text-left"></th>
                <th className="text-left">Pessoa</th>
                <th className="text-left">Disciplinas</th>
                <th className="text-right">WIP</th>
                <th className="text-right">Carga aberta</th>
                <th className="text-right">Entregue 30d</th>
                <th className="text-right">Bloq.</th>
                <th className="text-right">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {eng.porPessoa.map((p) => (
                <React.Fragment key={p.usuarioId}>
                  <tr className="cursor-pointer hover:bg-secondary/30" onClick={() => setPessoaExpandida(pessoaExpandida === p.usuarioId ? null : p.usuarioId)}>
                    <td className="py-2 pl-1">{pessoaExpandida === p.usuarioId ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                    <td className="font-medium">{p.nome}</td>
                    <td>{p.disciplinas.map((d) => LABEL_DISC[d] ?? d).join(" + ")}</td>
                    <td className="text-right">{p.wip}</td>
                    <td className="text-right font-semibold">{p.backlogPontos} pts</td>
                    <td className="text-right font-semibold">{p.entreguePontos} pts</td>
                    <td className="text-right">{p.pacotesBloqueados}</td>
                    <td className="text-right">{p.noPrazoPct == null ? "—" : `${p.noPrazoPct}%`}</td>
                  </tr>
                  {pessoaExpandida === p.usuarioId && (
                    <tr>
                      <td colSpan={8} className="bg-secondary/20 px-4 py-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          {p.porDisciplina.map((d) => (
                            <div key={d.disciplina} className="rounded-md border border-border bg-card p-2.5">
                              <p className="text-[11px] font-semibold">{LABEL_DISC[d.disciplina] ?? d.disciplina}</p>
                              <p className="mt-1 text-[10px] text-muted-foreground">WIP: {d.wip} · Carga: {d.backlogPontos} pts · Entregue: {d.entreguePontos} pts</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {eng.porPessoa.length === 0 && <p className="py-8 text-center text-muted-foreground">Sem pacotes atribuídos ainda.</p>}
        </div>
      </Secao>

      {/* Bloco 4 — Pacotes críticos */}
      <Secao titulo="Pacotes críticos" descricao="Bloqueios e violações de SLA vêm antes da complexidade. Motivo objetivo do bloqueio, quando houver.">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {eng.pacotesCriticos.slice(0, 12).map((p) => (
            <Link key={p.id} href={`/empreendimentos/${p.empreendimentoId}`} className="rounded-md border border-border p-2.5 hover:bg-secondary/30">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold">{p.empreendimentoNome} · {p.tipologia}</span>
                <Pill tone={p.bloqueado || p.complexidade >= 80 ? "danger" : p.complexidade >= 60 ? "warning" : "default"}>
                  {p.bloqueado ? "BLOQ." : `${p.complexidade}/100`}
                </Pill>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{LABEL_DISC[p.disciplina] ?? p.disciplina} · {p.executorNome} · {p.leadTimeDiasUteis}d úteis</p>
              {p.bloqueado && <p className="mt-1 text-[11px] text-warning">Bloqueado há {Math.max(1, Math.floor(p.bloqueadoHoras / 24))}d · {p.motivoBloqueio ?? "motivo não informado"}</p>}
            </Link>
          ))}
          {eng.pacotesCriticos.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">Nenhum pacote crítico agora.</p>}
        </div>
      </Secao>

      {/* Bloco 5 — Capacidade × demanda */}
      <Secao titulo="A demanda cabe no ritmo observado da equipe?" descricao="Ritmo observado dos últimos 30 dias — não é capacidade consolidada, é o que foi medido até agora.">
        <div className="grid gap-3 sm:grid-cols-3">
          {eng.capacidadePorDisciplina.map((d) => {
            const semDemanda = d.backlogAtualPontos === 0;
            const baseInsuficiente = d.pacotesEntregues30d < 5;
            const situacao = semDemanda ? "success" : baseInsuficiente ? "default" : d.coberturaBacklogMeses != null && d.coberturaBacklogMeses > 1 ? "danger" : "success";
            return (
              <div key={d.disciplina} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold">{LABEL_DISC[d.disciplina] ?? d.disciplina}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Demanda aberta</p><p className="font-semibold">{d.backlogAtualPontos} pts</p></div>
                  <div>
                    <p className="text-muted-foreground">Ritmo observado</p>
                    {baseInsuficiente ? (
                      <p className="font-semibold text-muted-foreground">— <span className="text-[10px]">base insuficiente (n={d.pacotesEntregues30d})</span></p>
                    ) : (
                      <p className="font-semibold">{d.capacidadeObservada30dPontos} pts/mês</p>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  {semDemanda ? (
                    <Pill tone="success">Sem demanda aberta</Pill>
                  ) : baseInsuficiente ? (
                    <Pill tone="default">Amostra insuficiente</Pill>
                  ) : (
                    <>
                      <Pill tone={situacao === "danger" ? "danger" : "success"}>{situacao === "danger" ? "ATENÇÃO" : "CONTROLADO"}</Pill>
                      <p className="mt-1 text-[11px] text-muted-foreground">Cobertura estimada: {d.coberturaBacklogMeses} mês(es)</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Secao>

      {/* Bloco 6 — Qualidade e prazo */}
      <Secao titulo="Qualidade e prazo" descricao="Sempre com o tamanho da amostra visível — nunca apresentado como conclusão consolidada quando a base é pequena.">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Em atraso agora</p>
            <p className="text-lg font-bold">{eng.foraSla} <span className="text-[11px] font-normal text-muted-foreground">de {eng.backlog} em andamento</span></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lead time médio</p>
            {eng.amostrasLeadTime === 0 ? (
              <p className="text-lg font-bold text-muted-foreground">— <span className="text-[11px] font-normal">sem base</span></p>
            ) : (
              <p className="text-lg font-bold">{eng.leadTimeMedioDias}d <span className="text-[11px] font-normal text-muted-foreground">n={eng.amostrasLeadTime}{eng.amostrasLeadTime < 10 ? " · amostra inicial" : ""}</span></p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">First Pass Yield</p>
            {eng.firstPassYieldAmostras === 0 ? (
              <p className="text-lg font-bold text-muted-foreground">— <span className="text-[11px] font-normal">sem base</span></p>
            ) : (
              <p className="text-lg font-bold">{eng.firstPassYieldPct}% <span className="text-[11px] font-normal text-muted-foreground">n={eng.firstPassYieldAmostras}{eng.firstPassYieldAmostras < 10 ? " · amostra inicial" : ""}</span></p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Retrabalho · 30d</p>
            <p className="text-lg font-bold">{eng.retrabalhosObservados30d}</p>
          </div>
        </div>
      </Secao>
    </>
  );
}
