"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { registrarDecisaoCliente } from "@/features/negociacao/actions/negociacao-actions";
import type { CotacaoDetalhe } from "@/features/cotacoes/components/cotacao-detail-view";

interface HistoricoItem {
  id: string;
  decisao: string;
  observacoes: string | null;
  registradoPorNome: string;
  createdAt: string;
}

interface Props {
  empreendimentoId: string;
  cotacoes: CotacaoDetalhe[];
  historico: HistoricoItem[];
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function NegociacaoView({ empreendimentoId, cotacoes, historico }: Props) {
  const router = useRouter();
  const [formAberto, setFormAberto] = React.useState<"ACEITO" | "RECUSADO" | null>(null);
  const [vencedoraId, setVencedoraId] = React.useState(cotacoes[0]?.id ?? "");
  const [observacoes, setObservacoes] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const cotacoesAtivas = cotacoes.filter((c) => c.status !== "RECUSADA");

  async function handleConfirmar() {
    setErro(null);
    setSalvando(true);
    try {
      const r = await registrarDecisaoCliente({
        empreendimentoId,
        decisao: formAberto!,
        cotacaoVencedoraId: formAberto === "ACEITO" ? vencedoraId : undefined,
        observacoes,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setFormAberto(null);
      setObservacoes("");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Cotação enviada ao cliente</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {cotacoesAtivas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma cotação enviada ainda — gere e envie uma na tela de Orçamento antes de negociar.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {cotacoesAtivas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5"
                >
                  <span className="text-sm font-medium">{c.fornecedor.nomeExibido}</span>
                  <span className="font-mono text-sm font-semibold">{formatBRL(c.totalGeral)}</span>
                </div>
              ))}
            </div>
          )}

          {!formAberto ? (
            <div className="mt-5 flex gap-2.5">
              <Button onClick={() => setFormAberto("ACEITO")} disabled={cotacoesAtivas.length === 0}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Cliente aceitou
              </Button>
              <Button variant="outline" onClick={() => setFormAberto("RECUSADO")}>
                <XCircle className="mr-1.5 h-4 w-4" />
                Cliente recusou
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 rounded-lg border border-border bg-secondary/20 p-4">
              <p className="text-sm font-semibold">
                {formAberto === "ACEITO" ? "Registrar aceite do cliente" : "Registrar recusa do cliente"}
              </p>

              {formAberto === "ACEITO" && cotacoesAtivas.length > 1 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Qual fornecedor o cliente escolheu?</label>
                  <select
                    value={vencedoraId}
                    onChange={(e) => setVencedoraId(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {cotacoesAtivas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fornecedor.nomeExibido} — {formatBRL(c.totalGeral)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Observações (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Ex: cliente pediu desconto de 5%, negociado direto por telefone"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {erro && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleConfirmar} disabled={salvando}>
                  {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Confirmar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormAberto(null);
                    setErro(null);
                  }}
                  disabled={salvando}
                >
                  Cancelar
                </Button>
              </div>

              {formAberto === "ACEITO" && (
                <p className="text-xs text-muted-foreground">
                  Confirmar aqui avança o empreendimento pra Contratado e marca essa cotação como o preço final.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {historico.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2.5 border-b border-border">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Histórico de decisões</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-5">
            {historico.map((h) => (
              <div key={h.id} className="flex flex-col gap-0.5 rounded-lg border border-border px-3.5 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${h.decisao === "ACEITO" ? "text-success" : "text-destructive"}`}>
                    {h.decisao === "ACEITO" ? "Aceito" : "Recusado"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString("pt-BR")} · {h.registradoPorNome}
                  </span>
                </div>
                {h.observacoes && <p className="text-xs text-muted-foreground">{h.observacoes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
