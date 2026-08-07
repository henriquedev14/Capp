"use client";

import * as React from "react";
import { FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CotacaoDetailView, type CotacaoDetalhe } from "@/features/cotacoes/components/cotacao-detail-view";

const LABELS_STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  RESPONDIDA: "Respondida",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

const CORES_ABA: Record<string, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  ENVIADA: "bg-primary/10 text-primary",
  RESPONDIDA: "bg-warning/10 text-warning",
  ACEITA: "bg-success/10 text-success",
  RECUSADA: "bg-muted text-muted-foreground",
};

interface Props {
  cotacoes: CotacaoDetalhe[];
  totalMateriais: number;
  aplicarTabelaPrecoSlot?: React.ReactNode;
}

/**
 * Visão unificada das cotações de um empreendimento — Etapa 1 da
 * unificação (só visual, cada fornecedor continua sendo um registro
 * Cotacao separado por trás). Antes cada fornecedor exigia navegar
 * pra uma página própria; agora é uma aba na mesma tela. Recusar uma
 * aba não afeta as outras — cada seção mantém seu próprio status.
 *
 * Também absorveu o que era o "Bloco 2 — Materiais" (visão separada
 * do preço final) — o Henrique pediu pra tirar essa duplicação: a
 * aplicação de preço acontece direto aqui, por fornecedor, sem uma
 * segunda tela mostrando "o resultado" à parte.
 */
export function CotacoesUnificadas({ cotacoes, totalMateriais, aplicarTabelaPrecoSlot }: Props) {
  const [abaAtiva, setAbaAtiva] = React.useState(cotacoes[0]?.id ?? "");
  const cotacaoAtiva = cotacoes.find((c) => c.id === abaAtiva) ?? cotacoes[0];

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
      <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <FileSpreadsheet className="h-[18px] w-[18px] text-accent-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-[15px]">
              Cotação — {cotacoes.length} fornecedor{cotacoes.length > 1 ? "es" : ""} consultado{cotacoes.length > 1 ? "s" : ""}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Uma rodada, uma seção por fornecedor. Se um recusar, gera-se outra rodada só pra ele.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {totalMateriais > 0 && (
            <div className="rounded-lg bg-primary/10 px-4 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Total Materiais</p>
              <p className="text-base font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalMateriais)}
              </p>
            </div>
          )}
          {aplicarTabelaPrecoSlot}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mb-4 flex flex-wrap gap-1.5 border-b border-border pb-4">
          {cotacoes.map((c) => (
            <button
              key={c.id}
              onClick={() => setAbaAtiva(c.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                abaAtiva === c.id
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              <span className="truncate max-w-[120px]">{c.fornecedor.nomeExibido}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${CORES_ABA[c.status] ?? "bg-muted"}`}>
                {LABELS_STATUS[c.status] ?? c.status}
              </span>
            </button>
          ))}
        </div>

        {cotacaoAtiva && <CotacaoDetailView cotacao={cotacaoAtiva} />}
      </CardContent>
    </Card>
  );
}
