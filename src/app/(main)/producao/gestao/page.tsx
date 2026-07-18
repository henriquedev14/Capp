export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, Pause, Lightbulb, Building2, TrendingUp, FileWarning } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import {
  gerarAcoesRecomendadas,
  agruparFilaPorObra,
  calcularRitmoSemanal,
  listarItensSemDono,
} from "@/features/producao/lib/gestao-producao";
import { StatusProducaoToggle } from "@/features/producao/components/status-producao-toggle";

const CONFIG_RISCO = {
  ALTO: { label: "Risco alto", icone: AlertTriangle, classe: "bg-destructive/10 text-destructive" },
  MEDIO: { label: "Atenção", icone: AlertCircle, classe: "bg-warning/10 text-warning" },
  BAIXO: { label: "No prazo", icone: CheckCircle2, classe: "bg-success/10 text-success" },
  SEM_DATA: { label: "Sem data de remessa", icone: HelpCircle, classe: "bg-muted text-muted-foreground" },
  STANDBY: { label: "Stand-by", icone: Pause, classe: "bg-secondary text-muted-foreground" },
} as const;

const CONFIG_ACAO = {
  RISCO_ATRASO: { icone: AlertTriangle, classe: "border-destructive/30 bg-destructive/5 text-destructive" },
  REALOCACAO: { icone: TrendingUp, classe: "border-warning/30 bg-warning/5 text-warning" },
  SEM_DONO: { icone: FileWarning, classe: "border-muted-foreground/20 bg-secondary/40 text-muted-foreground" },
} as const;

function formatData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default async function GestaoProducaoPage() {
  const podeVer = await temPermissao(PERMISSOES.PRODUCAO_VER_DASHBOARD);
  if (!podeVer) redirect("/painel");

  const [acoes, obras, ritmo, semDono] = await Promise.all([
    gerarAcoesRecomendadas(),
    agruparFilaPorObra(),
    calcularRitmoSemanal(),
    listarItensSemDono(),
  ]);

  const maiorKitsDia = Math.max(...ritmo.dias.map((d) => d.kits), 1);
  const variacaoSemanal =
    ritmo.totalSemanaPassada > 0
      ? Math.round(((ritmo.totalEstaSemana - ritmo.totalSemanaPassada) / ritmo.totalSemanaPassada) * 100)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Produção", "Gestão"]}
        title="Gestão da Produção"
        description="O que decidir hoje, como cada obra está, e o ritmo da fábrica — não é a tela de quem registra, é a de quem decide."
      />

      {/* BLOCO 1 — Ações recomendadas: a pergunta "o que eu faço agora?" respondida direto. */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 border-b border-border">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-[15px]">Ações recomendadas hoje ({acoes.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-4">
          {acoes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nada urgente pra decidir agora — tudo dentro do esperado.
            </p>
          ) : (
            acoes.map((acao, i) => {
              const cfg = CONFIG_ACAO[acao.tipo];
              const Icone = cfg.icone;
              const conteudo = (
                <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${cfg.classe}`}>
                  <Icone className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{acao.titulo}</p>
                    <p className="text-xs opacity-90">{acao.detalhe}</p>
                  </div>
                </div>
              );
              return acao.empreendimentoId ? (
                <Link key={i} href={`/empreendimentos/${acao.empreendimentoId}`}>
                  {conteudo}
                </Link>
              ) : (
                <div key={i}>{conteudo}</div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BLOCO 2 — Ritmo da semana, comparado com a anterior */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 border-b border-border">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Ritmo da semana</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-end gap-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">{ritmo.totalEstaSemana}</span>
              <span className="text-sm text-muted-foreground">kits nos últimos 7 dias</span>
              {variacaoSemanal !== null && (
                <span className={`ml-auto text-sm font-semibold ${variacaoSemanal >= 0 ? "text-success" : "text-destructive"}`}>
                  {variacaoSemanal >= 0 ? "▲" : "▼"} {Math.abs(variacaoSemanal)}% vs semana anterior
                </span>
              )}
            </div>
            <div className="flex items-end gap-1.5" style={{ height: "80px" }}>
              {ritmo.dias.map((d) => (
                <div key={d.data} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${Math.max((d.kits / maiorKitsDia) * 60, 2)}px` }}
                    title={`${formatData(d.data)}: ${d.kits} kits`}
                  />
                  <span className="text-[9px] text-muted-foreground">{formatData(d.data)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* BLOCO 4 — Sem dono / parado */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 border-b border-border">
            <FileWarning className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Parado sem ninguém mexer ({semDono.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {semDono.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum levantamento travado no momento.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border/50">
                {semDono.map((item, i) => (
                  <Link
                    key={i}
                    href={`/empreendimentos/${item.empreendimentoId}`}
                    className="flex items-center justify-between gap-3 py-2 hover:bg-secondary/20"
                  >
                    <div>
                      <p className="text-sm text-foreground">{item.empreendimentoNome} — {item.tipologiaNome}</p>
                      <p className="text-xs text-muted-foreground">{item.tipo}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-warning">{item.diasEmAberto}d</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BLOCO 3 — Visão por obra, com drill-down pra tipologia */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 border-b border-border">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-[15px]">Por obra</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border/50 p-0">
          {obras.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma obra em produção no momento.</p>
          ) : (
            obras.map((obra) => {
              const cfgObra = CONFIG_RISCO[obra.piorRisco];
              const IconeObra = cfgObra.icone;
              return (
                <details key={obra.empreendimentoId} className="group">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/20">
                    <div className="flex items-center gap-2">
                      <Link href={`/empreendimentos/${obra.empreendimentoId}`} className="font-medium text-foreground hover:text-primary hover:underline">
                        {obra.empreendimentoNome}
                      </Link>
                      <span className="text-xs text-muted-foreground">({obra.tipologias.length} tipologia(s))</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfgObra.classe}`}>
                      <IconeObra className="h-3.5 w-3.5" />
                      {cfgObra.label}
                    </span>
                  </summary>
                  <div className="overflow-x-auto border-t border-border/50 bg-secondary/10 px-4 py-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="py-1 text-left font-medium">Tipologia</th>
                          <th className="py-1 text-left font-medium">Remessa</th>
                          <th className="py-1 text-right font-medium">Dias úteis</th>
                          <th className="py-1 text-left font-medium">Progresso</th>
                          <th className="py-1 text-left font-medium">Situação</th>
                          <th className="py-1 text-right font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {obra.tipologias.map((t) => {
                          const cfg = CONFIG_RISCO[t.risco];
                          const Icone = cfg.icone;
                          return (
                            <tr key={t.tipologiaId}>
                              <td className="py-1.5 text-muted-foreground">{t.tipologiaNome}</td>
                              <td className="py-1.5 text-muted-foreground">{formatData(t.dataProximaRemessa)}</td>
                              <td className="py-1.5 text-right tabular-nums text-muted-foreground">{t.diasUteisAteRemessa ?? "—"}</td>
                              <td className="py-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="relative h-3 w-20 rounded bg-secondary/60">
                                    <div
                                      className={`absolute inset-y-0 left-0 rounded ${t.progressoPercentual >= 100 ? "bg-success" : "bg-primary"}`}
                                      style={{ width: `${Math.min(t.progressoPercentual, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs tabular-nums text-muted-foreground">{t.progressoPercentual}%</span>
                                </div>
                              </td>
                              <td className="py-1.5">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.classe}`}>
                                  <Icone className="h-3 w-3" />
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="py-1.5 text-right">
                                <StatusProducaoToggle tipologiaId={t.tipologiaId} statusAtual={t.statusProducao} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
