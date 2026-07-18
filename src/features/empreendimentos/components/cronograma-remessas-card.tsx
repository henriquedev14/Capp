"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { atualizarDataPrevistaRemessa } from "@/features/empreendimentos/actions/cronograma-remessas-actions";

interface LinhaCronograma {
  pavimentoId: string;
  localNome: string;
  pavimentoNome: string;
  dataPrevistaRemessa: string | null;
}

/**
 * Cronograma de Remessas — o Comercial preenche a previsão de entrega de
 * cada pavimento AQUI, cedo (na fase de estrutura física, antes mesmo do
 * contrato fechar). Essa data vira a fonte única que alimenta a Conta a
 * Receber (Financeiro), a fila de produção e o planejamento da fábrica —
 * sem precisar redigitar a mesma informação em três lugares diferentes.
 *
 * Recolhido por padrão — com muitos pavimentos (15+), a lista inteira
 * aberta poluía a página inteira do empreendimento antes de chegar em
 * qualquer outra informação.
 */
export function CronogramaRemessasCard({ linhas: linhasIniciais }: { linhas: LinhaCronograma[] }) {
  const router = useRouter();
  const [linhas, setLinhas] = React.useState(linhasIniciais);
  const [salvandoId, setSalvandoId] = React.useState<string | null>(null);
  const [aberto, setAberto] = React.useState(false);

  if (linhas.length === 0) return null;

  const preenchidas = linhas.filter((l) => l.dataPrevistaRemessa).length;

  async function handleMudarData(pavimentoId: string, novaData: string) {
    setLinhas((prev) =>
      prev.map((l) => (l.pavimentoId === pavimentoId ? { ...l, dataPrevistaRemessa: novaData || null } : l))
    );
    setSalvandoId(pavimentoId);
    try {
      const r = await atualizarDataPrevistaRemessa(pavimentoId, novaData);
      if ("erro" in r) alert(r.erro);
      router.refresh();
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <Card>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-border px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span className="text-[15px] font-semibold text-foreground">Cronograma de Remessas</span>
          <span className="text-xs text-muted-foreground">
            ({preenchidas}/{linhas.length} preenchidas)
          </span>
        </div>
        {aberto ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {aberto && (
        <CardContent className="pt-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Previsão de entrega de cada pavimento — alimenta automaticamente o Financeiro, a Produção e a fábrica.
          </p>
          <div className="flex flex-col divide-y divide-border/50">
            {linhas.map((l) => (
              <div key={l.pavimentoId} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-foreground">
                  {l.localNome} — {l.pavimentoNome}
                </span>
                <div className="flex items-center gap-2">
                  {salvandoId === l.pavimentoId && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <input
                    type="date"
                    value={l.dataPrevistaRemessa ?? ""}
                    onChange={(e) => handleMudarData(l.pavimentoId, e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
