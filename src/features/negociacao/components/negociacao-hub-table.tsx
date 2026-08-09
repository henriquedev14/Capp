"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LinhaHubNegociacao } from "@/features/negociacao/actions/negociacao-actions";

const LABELS_STATUS: Record<string, { label: string; classe: string }> = {
  AGUARDANDO_CLIENTE: { label: "Aguardando cliente", classe: "bg-primary/10 text-primary" },
  EM_REVISAO: { label: "Em revisão", classe: "bg-warning/10 text-warning" },
  APROVADA: { label: "Aprovada", classe: "bg-success/10 text-success" },
  RECUSADA: { label: "Recusada", classe: "bg-destructive/10 text-destructive" },
  RETORNOU_ENGENHARIA: { label: "Retornou p/ engenharia", classe: "bg-muted text-muted-foreground" },
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

type FiltroStatus = "TODAS" | keyof typeof LABELS_STATUS;

export function NegociacaoHubTable({ linhas }: { linhas: LinhaHubNegociacao[] }) {
  const [filtro, setFiltro] = React.useState<FiltroStatus>("TODAS");
  const [ordenacao, setOrdenacao] = React.useState<"followup" | "dias" | "valor">("followup");

  const contagens = React.useMemo(() => {
    const c: Record<string, number> = { TODAS: linhas.length };
    for (const l of linhas) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [linhas]);

  const filtradas = React.useMemo(() => {
    let arr = filtro === "TODAS" ? linhas : linhas.filter((l) => l.status === filtro);
    arr = [...arr].sort((a, b) => {
      if (ordenacao === "valor") return b.valorAtual - a.valorAtual;
      if (ordenacao === "dias") return b.diasSemInteracao - a.diasSemInteracao;
      // followup: vencidos primeiro, depois mais próximos
      const aData = a.proximaAcaoData ? new Date(a.proximaAcaoData).getTime() : Infinity;
      const bData = b.proximaAcaoData ? new Date(b.proximaAcaoData).getTime() : Infinity;
      if (a.followUpVencido !== b.followUpVencido) return a.followUpVencido ? -1 : 1;
      return aData - bData;
    });
    return arr;
  }, [linhas, filtro, ordenacao]);

  const valorTotal = linhas.reduce((s, l) => s + l.valorAtual, 0);
  const vencidos = linhas.filter((l) => l.followUpVencido).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Em negociação</p>
            <p className="mt-1.5 text-2xl font-semibold">{linhas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Valor total</p>
            <p className="mt-1.5 text-2xl font-semibold">{formatBRL(valorTotal)}</p>
          </CardContent>
        </Card>
        <Card className={vencidos > 0 ? "bg-destructive/5" : undefined}>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Follow-up vencido</p>
            <p className={`mt-1.5 text-2xl font-semibold ${vencidos > 0 ? "text-destructive" : ""}`}>{vencidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Responsáveis distintos</p>
            <p className="mt-1.5 text-2xl font-semibold">
              {new Set(linhas.map((l) => l.responsavelNome)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltro("TODAS")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              filtro === "TODAS" ? "border-foreground bg-secondary" : "border-border text-muted-foreground"
            }`}
          >
            Todas <span className="text-muted-foreground">({contagens.TODAS ?? 0})</span>
          </button>
          {Object.entries(LABELS_STATUS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setFiltro(key as FiltroStatus)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                filtro === key ? "border-foreground bg-secondary" : "border-border text-muted-foreground"
              }`}
            >
              {label} <span className="text-muted-foreground">({contagens[key] ?? 0})</span>
            </button>
          ))}
        </div>
        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as typeof ordenacao)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
        >
          <option value="followup">Ordenar: follow-up mais próximo</option>
          <option value="dias">Mais tempo sem interação</option>
          <option value="valor">Maior valor</option>
        </select>
      </div>

      {filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma negociação nesse filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Empreendimento</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5">Responsável</th>
                <th className="px-3 py-2.5">Última interação</th>
                <th className="px-4 py-2.5">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((l) => {
                const statusInfo = LABELS_STATUS[l.status] ?? { label: l.status, classe: "bg-muted text-muted-foreground" };
                return (
                  <tr
                    key={l.empreendimentoId}
                    className={`border-t border-border hover:bg-secondary/20 ${
                      l.followUpVencido ? "bg-destructive/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/empreendimentos/${l.empreendimentoId}/negociacao`} className="font-medium hover:underline">
                        {l.nome}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-md px-2 py-1 text-[11.5px] font-semibold ${statusInfo.classe}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{formatBRL(l.valorAtual)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{l.responsavelNome}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {l.diasSemInteracao === 0 ? "hoje" : `há ${l.diasSemInteracao}d`}
                    </td>
                    <td className="px-4 py-3">
                      {l.followUpVencido ? (
                        <span className="flex items-center gap-1.5 font-medium text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Vencido
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{l.proximaAcao ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
