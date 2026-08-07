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

const CORES_STATUS: Record<string, string> = {
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
 * Cotacao separado por trás, com número próprio). Todas as cotações
 * ficam listadas na mesma página, uma seção completa por fornecedor
 * — sem precisar clicar pra trocar entre elas (ajustado em 07/08/2026
 * a pedido do Henrique, que queria tudo visível de uma vez, com o
 * nome do fornecedor e o número de cada cotação sempre à mostra).
 *
 * Também absorveu o que era o "Bloco 2 — Materiais" (visão separada
 * do preço final) — a aplicação de preço acontece direto aqui, por
 * fornecedor, sem uma segunda tela mostrando "o resultado" à parte.
 */
export function CotacoesUnificadas({ cotacoes, totalMateriais, aplicarTabelaPrecoSlot }: Props) {
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <FileSpreadsheet className="h-[18px] w-[18px] text-accent-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-[15px]">
                Cotação {cotacoes[0]?.numeroRodada} — {cotacoes.length} fornecedor{cotacoes.length > 1 ? "es" : ""} consultado{cotacoes.length > 1 ? "s" : ""}
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Uma rodada, uma seção por fornecedor abaixo. Se um recusar, gera-se outra rodada só pra ele.
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
      </Card>

      {cotacoes.map((c) => (
        <div key={c.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-foreground">{c.fornecedor.nomeExibido}</span>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${CORES_STATUS[c.status] ?? "bg-muted"}`}>
              {LABELS_STATUS[c.status] ?? c.status}
            </span>
          </div>
          <CotacaoDetailView cotacao={c} />
        </div>
      ))}
    </div>
  );
}
