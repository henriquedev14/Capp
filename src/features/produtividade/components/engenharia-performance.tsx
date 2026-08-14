import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsData } from "@/features/analytics/lib/types";

export function EngenhariaPerformance({ dados }: { dados: AnalyticsData["engenharia"] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardContent className="pt-4"><p className="text-[10px] uppercase text-muted-foreground">Carga aberta</p><p className="mt-1 text-2xl font-bold">{dados.complexidadeBacklog} pts</p><p className="text-[11px] text-muted-foreground">{dados.backlog} pacotes</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] uppercase text-muted-foreground">Bloqueados</p><p className="mt-1 text-2xl font-bold">{dados.bloqueados}</p><p className="text-[11px] text-muted-foreground">registro explícito</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] uppercase text-muted-foreground">Entregues · 30d</p><p className="mt-1 text-2xl font-bold">{dados.validados30d}</p><p className="text-[11px] text-muted-foreground">pacotes validados</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] uppercase text-muted-foreground">First Pass Yield</p><p className="mt-1 text-2xl font-bold">{dados.firstPassYieldPct == null ? "—" : `${dados.firstPassYieldPct}%`}</p><p className="text-[11px] text-muted-foreground">n={dados.firstPassYieldAmostras} instrumentados</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] uppercase text-muted-foreground">Retrabalhos · 30d</p><p className="mt-1 text-2xl font-bold">{dados.retrabalhosObservados30d}</p><p className="text-[11px] text-muted-foreground">após instrumentação</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Engenharia — produtividade ponderada</CardTitle>
            <p className="text-xs text-muted-foreground">
              A unidade é o pacote de trabalho por disciplina/tipologia. Executor e validador são papéis separados.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-muted-foreground"><th className="py-2 text-left">Pessoa</th><th className="text-left">Disciplina</th><th className="text-right">WIP</th><th className="text-right">Carga pts</th><th className="text-right">Entregue pts</th><th className="text-right">Bloq.</th><th className="text-right">FPY</th><th className="text-right">Lead</th><th className="text-right">No prazo</th></tr></thead>
                <tbody className="divide-y divide-border/60">
                  {dados.porPessoa.map((p) => (
                    <tr key={`${p.usuarioId}-${p.disciplina}`}>
                      <td className="py-2 font-medium">{p.nome}</td><td>{p.disciplina}</td><td className="text-right">{p.wip}</td><td className="text-right font-semibold">{p.backlogPontos}</td><td className="text-right font-semibold">{p.entreguePontos}</td><td className="text-right">{p.pacotesBloqueados}</td><td className="text-right">{p.qualidadePct == null ? "—" : `${p.qualidadePct}%`}</td><td className="text-right">{p.leadTimeMedioDias == null ? "—" : `${p.leadTimeMedioDias}d`}</td><td className="text-right">{p.noPrazoPct == null ? "—" : `${p.noPrazoPct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dados.porPessoa.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Sem dados suficientes de execução ainda.</p> : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b border-border"><CardTitle className="text-[15px]">Capacidade observada × backlog</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            {dados.capacidadePorDisciplina.map((d) => (
              <div key={d.disciplina} className="rounded-md border border-border p-3">
                <p className="font-semibold">{d.disciplina}</p>
                <div className="mt-2 grid grid-cols-2 gap-2"><div><span className="text-muted-foreground">Ritmo 30d</span><p className="text-lg font-bold">{d.capacidadeObservada30dPontos} pts</p></div><div><span className="text-muted-foreground">Backlog</span><p className="text-lg font-bold">{d.backlogAtualPontos} pts</p></div></div>
                <p className="text-muted-foreground">Cobertura no ritmo observado: {d.coberturaBacklogMeses == null ? "sem base" : `${d.coberturaBacklogMeses} mês(es)`}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-border"><CardTitle className="text-[15px]">Leitura da métrica</CardTitle></CardHeader>
        <CardContent className="grid gap-3 pt-4 text-xs text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
          <p><b className="text-foreground">Carga:</b> soma da complexidade dos pacotes em aberto. Repetição de unidades pesa menos que diversidade de tipologias.</p>
          <p><b className="text-foreground">Entregue:</b> pontos validados nos últimos 30 dias, creditados ao executor explícito (ou criador), nunca ao validador.</p>
          <p><b className="text-foreground">Qualidade:</b> First Pass Yield só usa validações ocorridas depois da instrumentação; histórico anterior não é inventado.</p>
          <p><b className="text-foreground">Bloqueio:</b> pausa/retomada passou a ser registrada sem timesheet. Tempo ativo continua indisponível até haver calendário de turnos suficiente.</p>
          <p className="rounded-md bg-warning/10 p-2 text-warning md:col-span-2 xl:col-span-4">Complexidade é heurística v1. Use 60–90 dias de histórico antes de transformar a pontuação em referência de meta individual.</p>
        </CardContent>
      </Card>
    </div>
  );
}
