"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  Users,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldAlert,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard, formatBRL, formatBRLCompacto, calcularDelta } from "@/features/dashboard/components/kpi";
import {
  GraficoLucroReal,
  GraficoReceitaPrevista,
  GraficoCustoFixoVariavel,
} from "@/features/dashboard/components/charts";
import type { DashboardData } from "@/features/dashboard/lib/queries";

import type { SegmentacaoCustos } from "@/features/financeiro/actions/cadastros-actions";
import { SegmentacaoCustosCard } from "@/features/financeiro/components/segmentacao-custos-card";
import type {
  ItemReceberPriorizado,
  TopCliente,
  ItemPagarPriorizado,
  ResultadoEmpresa,
  AlertaFinanceiro,
} from "@/features/financeiro/lib/comando-financeiro";

const CONFIG_ALERTA = {
  CAIXA_NEGATIVO: { icone: Wallet, classe: "border-l-destructive bg-destructive/[0.04]", texto: "text-destructive" },
  CONTA_VENCIDA: { icone: ShieldAlert, classe: "border-l-warning bg-warning/[0.04]", texto: "text-warning" },
  EMPRESA_DEFICITARIA: { icone: TrendingDown, classe: "border-l-destructive bg-destructive/[0.04]", texto: "text-destructive" },
  CATEGORIA_NAO_CLASSIFICADA: { icone: AlertTriangle, classe: "border-l-muted-foreground/40 bg-secondary/20", texto: "text-muted-foreground" },
} as const;

function formatDataCurta(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ViewFinanceiro({
  data,
  segmentacaoCustos,
  filaReceber,
  topClientes,
  filaPagar,
  resultadoEmpresas,
  alertasFinanceiros,
}: {
  data: DashboardData;
  segmentacaoCustos: SegmentacaoCustos;
  filaReceber: ItemReceberPriorizado[];
  topClientes: TopCliente[];
  filaPagar: ItemPagarPriorizado[];
  resultadoEmpresas: ResultadoEmpresa[];
  alertasFinanceiros: AlertaFinanceiro[];
}) {
  const f = data.financeiro;
  const deltaRecebido = calcularDelta(f.recebidoMes, f.recebidoMesAnterior);
  const deltaPago = calcularDelta(f.pagoMes, f.pagoMesAnterior);
  const resultadoMes = f.recebidoMes - f.pagoMes;
  const resultadoMesAnterior = f.recebidoMesAnterior - f.pagoMesAnterior;
  const deltaResultado = calcularDelta(resultadoMes, resultadoMesAnterior);

  const maiorTopCliente = Math.max(...topClientes.map((c) => c.valorEmAberto), 1);

  return (
    <div className="flex flex-col gap-5">
      {/* ============================================================
          NÍVEL 1 — RESUMO EXECUTIVO
          Cada número com contexto (vs mês anterior), nunca solto.
      ============================================================ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Recebido no mês"
          value={formatBRLCompacto(f.recebidoMes)}
          trend={{ delta: deltaRecebido, label: "vs mês anterior" }}
          tone="success"
          icon={TrendingUp}
          href="/financeiro/contas-a-receber"
        />
        <KpiCard
          label="Pago no mês"
          value={formatBRLCompacto(f.pagoMes)}
          trend={{ delta: deltaPago, label: "vs mês anterior" }}
          tone="warning"
          icon={TrendingDown}
          href="/financeiro/contas-a-pagar"
        />
        <KpiCard
          label="Resultado do mês"
          value={formatBRLCompacto(resultadoMes)}
          trend={{ delta: deltaResultado, label: "vs mês anterior" }}
          tone={resultadoMes >= 0 ? "primary" : "danger"}
          icon={resultadoMes >= 0 ? ArrowUpCircle : ArrowDownCircle}
        />
        <KpiCard
          label="Saldo em caixa"
          value={formatBRLCompacto(f.saldoCaixaAtual)}
          tone={f.saldoCaixaAtual >= 0 ? "primary" : "danger"}
          icon={Wallet}
          href="/financeiro/fluxo-de-caixa"
        />
      </div>

      {/* ============================================================
          CENTRAL DE ALERTAS — só exceções reais, com motivo e ação.
          Vem logo após o resumo porque é a segunda pergunta mais
          urgente: "o que exige decisão agora".
      ============================================================ */}
      {alertasFinanceiros.length > 0 && (
        <Card className="border-l-4 border-l-warning">
          <CardContent className="flex flex-col gap-2 pt-5">
            <div className="mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Central de alertas ({alertasFinanceiros.length})
              </h2>
            </div>
            {alertasFinanceiros.map((alerta, i) => {
              const cfg = CONFIG_ALERTA[alerta.tipo];
              const Icone = cfg.icone;
              const conteudo = (
                <div className={`flex items-start gap-3 border-l-2 px-3 py-2.5 ${cfg.classe}`}>
                  <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.texto}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{alerta.titulo}</p>
                    <p className="text-xs text-muted-foreground">{alerta.detalhe}</p>
                  </div>
                  {alerta.href && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>
              );
              return alerta.href ? (
                <Link key={i} href={alerta.href}>
                  {conteudo}
                </Link>
              ) : (
                <div key={i}>{conteudo}</div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ============================================================
          FLUXO DE CAIXA — seção central, não card clicável.
      ============================================================ */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Resultado de Caixa — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <GraficoLucroReal dados={f.lucroRealHistorico} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Receita prevista — próximos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <GraficoReceitaPrevista dados={f.receitaPrevista} />
        </CardContent>
      </Card>

      {/* ============================================================
          CONTAS A RECEBER / A PAGAR — fila priorizada lado a lado.
      ============================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Contas a Receber — fila priorizada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border/50 p-0">
            {filaReceber.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta pendente com data prevista.</p>
            ) : (
              filaReceber.map((item) => (
                <Link
                  key={item.id}
                  href={`/empreendimentos/${item.empreendimentoId}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.clienteNome}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      {item.empreendimentoNome}
                      {item.empreendimentoArquivado && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Arquivado
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(item.valor)}</p>
                    <p className={`text-xs font-medium ${item.diasAtraso > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {item.diasAtraso > 0 ? `${item.diasAtraso}d atrasado` : formatDataCurta(item.dataPrevista)}
                    </p>
                  </div>
                </Link>
              ))
            )}
            <Link href="/financeiro/contas-a-receber" className="px-4 py-2.5 text-xs font-medium text-primary hover:underline">
              Ver todas as contas a receber →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Contas a Pagar — fila priorizada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border/50 p-0">
            {filaPagar.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta pendente.</p>
            ) : (
              filaPagar.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.descricao}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.categoriaNome} · {item.empresaNome}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(item.valor)}</p>
                    <p className={`text-xs font-medium ${item.diasAtraso > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {item.diasAtraso > 0 ? `${item.diasAtraso}d vencido` : formatDataCurta(item.dataVencimento)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <Link href="/financeiro/contas-a-pagar" className="px-4 py-2.5 text-xs font-medium text-primary hover:underline">
              Ver todas as contas a pagar →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          EMPRESAS DO GRUPO — comparação lado a lado, sem esconder
          problema individual atrás da média do grupo.
      ============================================================ */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 border-b border-border">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-[15px]">Resultado por Empresa do Grupo — mês atual</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {resultadoEmpresas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Empresa</th>
                    <th className="px-3 py-2 text-right font-medium">Recebido</th>
                    <th className="px-3 py-2 text-right font-medium">Pago</th>
                    <th className="px-3 py-2 text-right font-medium">Resultado</th>
                    <th className="px-3 py-2 text-right font-medium">Vencidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {resultadoEmpresas.map((emp) => (
                    <tr key={emp.empresaId} className={emp.resultado < 0 ? "bg-destructive/5" : ""}>
                      <td className="px-3 py-2 font-medium text-foreground">{emp.empresaNome}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-success">{formatBRL(emp.recebidoMes)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-warning">{formatBRL(emp.pagoMes)}</td>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${emp.resultado >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatBRL(emp.resultado)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {emp.contasPagarVencidas > 0 ? formatBRL(emp.contasPagarVencidas) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================
          TOP CLIENTES DEVEDORES + ESTRUTURA DE CUSTO — lado a lado.
      ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 border-b border-border">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Maiores clientes devedores</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 pt-5">
            {topClientes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum valor em aberto.</p>
            ) : (
              topClientes.map((c) => (
                <div key={c.clienteNome} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-foreground">{c.clienteNome}</span>
                  <div className="relative h-5 flex-1 rounded bg-secondary/50">
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-primary"
                      style={{ width: `${Math.max((c.valorEmAberto / maiorTopCliente) * 100, 3)}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatBRLCompacto(c.valorEmAberto)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Estrutura de custo do mês</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <GraficoCustoFixoVariavel fixo={f.custoFixoVsVariavel.fixo} variavel={f.custoFixoVsVariavel.variavel} />
          </CardContent>
        </Card>
      </div>

      <SegmentacaoCustosCard dados={segmentacaoCustos} />
    </div>
  );
}
