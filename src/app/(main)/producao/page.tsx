export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Pause,
  Lightbulb,
  Building2,
  TrendingUp,
  TrendingDown,
  FileWarning,
  Factory,
  ChevronRight,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import {
  gerarAcoesRecomendadas,
  agruparFilaPorObra,
  calcularRitmoSemanal,
  listarItensSemDono,
  calcularGargaloPorBancada,
} from "@/features/producao/lib/gestao-producao";
import { contarKitsFinalizados } from "@/features/producao/actions/producao-actions";
import { StatusProducaoToggle } from "@/features/producao/components/status-producao-toggle";

const CONFIG_RISCO = {
  ALTO: { label: "Risco alto", icone: AlertTriangle, classe: "bg-destructive/10 text-destructive", barra: "bg-destructive" },
  MEDIO: { label: "Atenção", icone: AlertCircle, classe: "bg-warning/10 text-warning", barra: "bg-warning" },
  BAIXO: { label: "No prazo", icone: CheckCircle2, classe: "bg-success/10 text-success", barra: "bg-success" },
  SEM_DATA: { label: "Sem data de remessa", icone: HelpCircle, classe: "bg-muted text-muted-foreground", barra: "bg-muted-foreground" },
  STANDBY: { label: "Stand-by", icone: Pause, classe: "bg-secondary text-muted-foreground", barra: "bg-muted-foreground" },
} as const;

const CONFIG_ACAO = {
  RISCO_ATRASO: { icone: AlertTriangle, classe: "border-l-destructive bg-destructive/[0.03]", texto: "text-destructive" },
  REALOCACAO: { icone: TrendingUp, classe: "border-l-warning bg-warning/[0.03]", texto: "text-warning" },
  SEM_DONO: { icone: FileWarning, classe: "border-l-muted-foreground/40 bg-secondary/20", texto: "text-muted-foreground" },
} as const;

function formatData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default async function GestaoProducaoPage() {
  const podeVer = await temPermissao(PERMISSOES.PRODUCAO_VER_DASHBOARD);
  if (!podeVer) redirect("/producao/tablet");

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const fimDia = new Date(inicioDia);
  fimDia.setDate(fimDia.getDate() + 1);

  const [acoes, obras, ritmo, semDono, kitsHoje, gargalo] = await Promise.all([
    gerarAcoesRecomendadas(),
    agruparFilaPorObra(),
    calcularRitmoSemanal(),
    listarItensSemDono(),
    contarKitsFinalizados(inicioDia, fimDia),
    calcularGargaloPorBancada(),
  ]);

  const maiorKitsDia = Math.max(...ritmo.dias.map((d) => d.kits), 1);
  const variacaoSemanal =
    ritmo.totalSemanaPassada > 0
      ? Math.round(((ritmo.totalEstaSemana - ritmo.totalSemanaPassada) / ritmo.totalSemanaPassada) * 100)
      : null;

  const obrasEmRiscoAlto = obras.filter((o) => o.piorRisco === "ALTO").length;
  const maiorGargalo = Math.max(...gargalo.map((g) => g.quantidadeUHHoje), 1);
  const mediaGargalo = gargalo.reduce((s, g) => s + g.quantidadeUHHoje, 0) / Math.max(gargalo.length, 1);
  const bancadaGargalo = gargalo.find((g) => g.quantidadeUHHoje < mediaGargalo * 0.5);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={["Produção"]}
        title="Gestão da Produção"
        description="Como está a operação agora, o que decidir hoje, e a tendência da fábrica."
      />

      {/* ============================================================
          NÍVEL 1 — VISÃO EXECUTIVA
          4 números que respondem "como estamos AGORA", cada um com
          criticidade, meta e tendência — nunca um valor sozinho sem
          contexto pra dizer se é bom ou ruim.
      ============================================================ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PainelExecutivo
          label="Kits finalizados hoje"
          valor={`${kitsHoje.quantidade}`}
          meta={`meta ${kitsHoje.meta}`}
          critico={kitsHoje.percentual < 0.7}
          atencao={kitsHoje.percentual >= 0.7 && kitsHoje.percentual < 1}
          rodape={`${(kitsHoje.percentual * 100).toFixed(0)}% da meta do dia`}
        />
        <PainelExecutivo
          label="Ritmo — últimos 7 dias"
          valor={`${ritmo.totalEstaSemana}`}
          meta="kits"
          critico={variacaoSemanal !== null && variacaoSemanal < -15}
          atencao={variacaoSemanal !== null && variacaoSemanal < 0 && variacaoSemanal >= -15}
          rodape={
            variacaoSemanal === null
              ? "sem semana anterior pra comparar"
              : `${variacaoSemanal >= 0 ? "▲" : "▼"} ${Math.abs(variacaoSemanal)}% vs semana passada`
          }
        />
        <PainelExecutivo
          label="Obras em risco alto"
          valor={`${obrasEmRiscoAlto}`}
          meta={`de ${obras.length} ativas`}
          critico={obrasEmRiscoAlto > 0}
          rodape={obrasEmRiscoAlto > 0 ? "remessa próxima, progresso baixo" : "nenhuma obra crítica agora"}
        />
        <PainelExecutivo
          label="Ações pendentes"
          valor={`${acoes.length}`}
          meta="recomendadas"
          critico={acoes.some((a) => a.tipo === "RISCO_ATRASO")}
          atencao={acoes.length > 0 && !acoes.some((a) => a.tipo === "RISCO_ATRASO")}
          rodape={acoes.length === 0 ? "nada urgente agora" : "ver detalhe abaixo"}
        />
      </div>

      {/* ============================================================
          NÍVEL 2 — VISÃO DE AÇÃO
          "O que eu faço agora" respondido direto, logo após o resumo
          executivo — é a segunda pergunta mais urgente do gestor.
      ============================================================ */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="flex flex-col gap-2 pt-5">
          <div className="mb-1 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Ações recomendadas</h2>
          </div>
          {acoes.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Nada urgente pra decidir agora — tudo dentro do esperado.
            </p>
          ) : (
            acoes.map((acao, i) => {
              const cfg = CONFIG_ACAO[acao.tipo];
              const Icone = cfg.icone;
              const conteudo = (
                <div className={`flex items-start gap-3 border-l-2 px-3 py-2.5 ${cfg.classe}`}>
                  <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.texto}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{acao.titulo}</p>
                    <p className="text-xs text-muted-foreground">{acao.detalhe}</p>
                  </div>
                  {acao.empreendimentoId && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>
              );
              return acao.empreendimentoId ? (
                <Link key={i} href={`/empreendimentos/${acao.empreendimentoId}`} className="hover:bg-secondary/20">
                  {conteudo}
                </Link>
              ) : (
                <div key={i}>{conteudo}</div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ============================================================
          NÍVEL 3 — VISÃO DE EXCEÇÕES
          Duas colunas, mesmo peso: capacidade (gargalo por bancada) x
          processo (parado sem dono). São dois TIPOS diferentes de
          problema, por isso lado a lado, não empilhados.
      ============================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center gap-2">
              <Factory className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Gargalo por bancada — hoje</h2>
            </div>
            <div className="flex flex-col gap-2.5">
              {gargalo.map((g) => {
                const ehGargalo = bancadaGargalo?.bancadaId === g.bancadaId && g.quantidadeUHHoje > 0;
                return (
                  <div key={g.bancadaId} className="flex items-center gap-3">
                    <span className="flex w-32 shrink-0 items-center gap-1 truncate text-sm text-foreground">
                      {ehGargalo && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />}
                      {g.bancadaNome}
                    </span>
                    <div className="relative h-5 flex-1 rounded bg-secondary/50">
                      <div
                        className={`absolute inset-y-0 left-0 rounded ${ehGargalo ? "bg-warning" : "bg-primary"}`}
                        style={{ width: `${Math.max((g.quantidadeUHHoje / maiorGargalo) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                      {g.quantidadeUHHoje.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Parado sem ninguém mexer ({semDono.length})
              </h2>
            </div>
            {semDono.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Nenhum levantamento travado no momento.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border/50">
                {semDono.map((item, i) => (
                  <Link
                    key={i}
                    href={`/empreendimentos/${item.empreendimentoId}`}
                    className="flex items-center justify-between gap-3 py-2 hover:bg-secondary/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{item.empreendimentoNome} — {item.tipologiaNome}</p>
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

      {/* ============================================================
          NÍVEL 4 — VISÃO OPERACIONAL
          Por obra, resumida por padrão — clique pra aprofundar em
          tipologia. Não é tabela gigante logo de cara.
      ============================================================ */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-1 flex items-center gap-2 px-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Por obra</h2>
          </div>
          <div className="flex flex-col divide-y divide-border/50">
            {obras.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma obra em produção no momento.</p>
            ) : (
              obras.map((obra) => {
                const cfgObra = CONFIG_RISCO[obra.piorRisco];
                const IconeObra = cfgObra.icone;
                return (
                  <details key={obra.empreendimentoId} className="group">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-2 py-3 hover:bg-secondary/20">
                      <div className={`h-full w-1 shrink-0 rounded ${cfgObra.barra}`} style={{ minHeight: "20px" }} />
                      <div className="flex flex-1 items-center gap-2">
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
          </div>
        </CardContent>
      </Card>

      {/* ============================================================
          NÍVEL 5 — VISÃO ANALÍTICA
          Tendência histórica, mais embaixo — contexto, não urgência.
      ============================================================ */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Ritmo — últimos 14 dias</h2>
          </div>
          <div className="mt-3 flex items-end gap-1.5" style={{ height: "90px" }}>
            {ritmo.dias.map((d, i) => (
              <div key={d.data} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t ${i >= 7 ? "bg-primary" : "bg-primary/40"}`}
                  style={{ height: `${Math.max((d.kits / maiorKitsDia) * 65, 2)}px` }}
                  title={`${formatData(d.data)}: ${d.kits} kits`}
                />
                <span className="text-[9px] text-muted-foreground">{formatData(d.data)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Claro = semana anterior, escuro = esta semana. {ritmo.totalSemanaPassada} → {ritmo.totalEstaSemana} kits.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PainelExecutivo({
  label,
  valor,
  meta,
  rodape,
  critico,
  atencao,
}: {
  label: string;
  valor: string;
  meta: string;
  rodape: string;
  critico?: boolean;
  atencao?: boolean;
}) {
  // Tailwind precisa das classes completas e estáticas pra funcionar em
  // build (não gera CSS pra `text-${variavel}` interpolado) — por isso
  // um mapa de classes prontas, não concatenação de string.
  const estilo = critico
    ? { borda: "border-l-destructive", texto: "text-destructive" }
    : atencao
      ? { borda: "border-l-warning", texto: "text-warning" }
      : { borda: "border-l-success", texto: "text-success" };

  return (
    <Card className={`border-l-4 ${estilo.borda}`}>
      <CardContent className="pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={`text-3xl font-bold tabular-nums ${estilo.texto}`}>{valor}</span>
          <span className="text-xs text-muted-foreground">{meta}</span>
        </div>
        <p className={`mt-1 text-xs font-medium ${estilo.texto}`}>{rodape}</p>
      </CardContent>
    </Card>
  );
}
