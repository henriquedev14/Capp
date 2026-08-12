"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { alternarCriterioLivreOrcamento } from "@/features/orcamentacao/actions/orcamento-actions";

/**
 * Toggle "Este orçamento é Livre" — marcado direto na tela de
 * Orçamento (não no cadastro do Empreendimento). Ao ligar, recalcula
 * os itens usando valor fixo × total de unidades; ao desligar, volta
 * pro critério normal (Área). Pedido pelo Henrique em 11/08/2026.
 */
export function ToggleCriterioLivre({ orcamentoId, ativo }: { orcamentoId: string; ativo: boolean }) {
  const router = useRouter();
  const [processando, setProcessando] = React.useState(false);

  async function handleToggle() {
    setProcessando(true);
    try {
      const r = await alternarCriterioLivreOrcamento(orcamentoId, !ativo);
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input type="checkbox" checked={ativo} onChange={handleToggle} disabled={processando} className="h-4 w-4 accent-primary" />
      <span className="text-sm font-medium text-foreground">Este orçamento é Livre (valor × total de unidades)</span>
      {processando && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </label>
  );
}
