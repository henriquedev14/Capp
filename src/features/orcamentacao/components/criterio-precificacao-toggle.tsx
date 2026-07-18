"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ruler, Hash } from "lucide-react";

import { atualizarCriterioPrecificacao } from "@/features/orcamentacao/actions/precos-actions";

interface Props {
  criterioAtual: "AREA" | "PONTOS_TETO";
  podeEditar: boolean;
}

export function CriterioPrecificacaoToggle({ criterioAtual, podeEditar }: Props) {
  const router = useRouter();
  const [salvando, setSalvando] = React.useState(false);

  async function escolher(criterio: "AREA" | "PONTOS_TETO") {
    if (criterio === criterioAtual || !podeEditar) return;
    setSalvando(true);
    const r = await atualizarCriterioPrecificacao(criterio);
    setSalvando(false);
    if ("erro" in r) {
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3">
      <span className="text-sm font-medium text-foreground">Critério de precificação do Bloco 1:</span>
      <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
        <button
          onClick={() => escolher("AREA")}
          disabled={salvando || !podeEditar}
          className={
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
            (criterioAtual === "AREA" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          <Ruler className="h-3.5 w-3.5" />
          Por Área (m²)
        </button>
        <button
          onClick={() => escolher("PONTOS_TETO")}
          disabled={salvando || !podeEditar}
          className={
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
            (criterioAtual === "PONTOS_TETO" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          <Hash className="h-3.5 w-3.5" />
          Por Pontos de Teto
        </button>
      </div>
      {salvando && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
