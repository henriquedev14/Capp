"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Send, FileDown, FileText, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { marcarRodadaComoEnviada, deletarCotacao } from "@/features/cotacoes/actions/cotacao-actions";
import type { CotacaoDetalhe } from "@/features/cotacoes/components/cotacao-detail-view";

const LABELS_STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  RESPONDIDA: "Respondida",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

const CORES_STATUS: Record<string, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  ENVIADA: "bg-primary/10 text-primary",
  RESPONDIDA: "bg-warning/10 text-warning",
  ACEITA: "bg-success/10 text-success",
  RECUSADA: "bg-muted text-muted-foreground",
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

interface Props {
  cotacoes: CotacaoDetalhe[];
  totalMateriais: number;
  aplicarTabelaPrecoSlot?: React.ReactNode;
}

/**
 * Visão unificada das cotações de um empreendimento — Etapa 1 da
 * unificação (cada fornecedor continua sendo um registro Cotacao
 * separado por trás, todos ligados à mesma RodadaCotacao). Ajustado
 * em 07/08/2026 a pedido do Henrique: a ação de "marcar como enviada"
 * é da rodada INTEIRA, um clique só — o que sobra por fornecedor é só
 * a lista de itens, sem repetir cabeçalho/botões que já são únicos.
 */
export function CotacoesUnificadas({ cotacoes, totalMateriais, aplicarTabelaPrecoSlot }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = React.useState(false);
  const [deletandoId, setDeletandoId] = React.useState<string | null>(null);

  const numeroRodada = cotacoes[0]?.numeroRodada;
  const rodadaId = cotacoes[0]?.rodadaId;
  const algumaEmRascunho = cotacoes.some((c) => c.status === "RASCUNHO");

  async function handleMarcarRodadaEnviada() {
    if (!rodadaId) return;
    setEnviando(true);
    try {
      const r = await marcarRodadaComoEnviada(rodadaId);
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  async function handleDeletar(id: string, numero: string) {
    if (!confirm(`Deletar a cotação ${numero}? Essa ação não pode ser desfeita.`)) return;
    setDeletandoId(id);
    try {
      const r = await deletarCotacao(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } finally {
      setDeletandoId(null);
    }
  }

  if (cotacoes.length === 0) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <FileSpreadsheet className="h-[18px] w-[18px] text-accent-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-[15px]">Cotação</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Nenhuma cotação gerada ainda para este orçamento.</p>
            </div>
          </div>
          {aplicarTabelaPrecoSlot}
        </CardHeader>
        <CardContent className="pt-5">
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">Use o botão &quot;Gerar Cotação&quot; acima para consultar fornecedores.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <FileSpreadsheet className="h-[18px] w-[18px] text-accent-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-[15px]">
              Cotação {numeroRodada} — {cotacoes.length} fornecedor{cotacoes.length > 1 ? "es" : ""} consultado{cotacoes.length > 1 ? "s" : ""}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Se um fornecedor recusar depois, gera-se outra rodada só pra ele.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {totalMateriais > 0 && (
            <div className="rounded-lg bg-primary/10 px-4 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Total Materiais</p>
              <p className="text-base font-bold text-primary">{formatBRL(totalMateriais)}</p>
            </div>
          )}
          {aplicarTabelaPrecoSlot}
          {rodadaId && (
            <>
              <button
                onClick={() => window.open(`/api/cotacoes/rodada/${rodadaId}/pdf`, "_blank")}
                title="Baixar PDF completo (todos os fornecedores)"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <FileDown className="h-3.5 w-3.5" />
                PDF completo
              </button>
              <button
                onClick={() => (window.location.href = `/api/cotacoes/rodada/${rodadaId}/csv`)}
                title="Baixar CSV completo (todos os fornecedores)"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <FileText className="h-3.5 w-3.5" />
                CSV completo
              </button>
            </>
          )}
          {algumaEmRascunho && (
            <Button size="sm" onClick={handleMarcarRodadaEnviada} disabled={enviando}>
              {enviando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Marcar como enviada
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-5">
        {cotacoes.map((c) => (
          <div key={c.id} className="rounded-lg border border-border overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/40 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold">{c.fornecedor.nomeExibido}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CORES_STATUS[c.status] ?? "bg-muted"}`}>
                  {LABELS_STATUS[c.status] ?? c.status}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => window.open(`/api/cotacoes/${c.id}/pdf`, "_blank")}
                  title="Baixar PDF"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <FileDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => (window.location.href = `/api/cotacoes/${c.id}/csv`)}
                  title="Baixar CSV"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <FileText className="h-4 w-4" />
                </button>
                {c.status !== "ACEITA" && (
                  <button
                    onClick={() => handleDeletar(c.id, c.numero)}
                    disabled={deletandoId === c.id}
                    title="Deletar"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/50">
                {c.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3.5 py-2 text-foreground">{item.descricao}</td>
                    <td className="px-2 py-2 text-muted-foreground w-24">{item.fabricante}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground w-16">{item.quantidade}</td>
                    <td className="px-2 py-2 text-muted-foreground w-12">{item.unidade}</td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground w-24">
                      {formatBRL(item.precoUnitario)}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-medium w-28">{formatBRL(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end border-t border-border bg-secondary/20 px-3.5 py-2 text-sm font-semibold">
              Total: {formatBRL(c.totalGeral)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
