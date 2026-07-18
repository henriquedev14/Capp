"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Loader2 } from "lucide-react";

import { alterarStatusProducaoTipologia } from "@/features/producao/actions/producao-actions";

export function StatusProducaoToggle({
  tipologiaId,
  statusAtual,
}: {
  tipologiaId: string;
  statusAtual: "ATIVA" | "STANDBY" | "CONCLUIDA";
}) {
  const router = useRouter();
  const [carregando, setCarregando] = React.useState(false);

  async function handleToggle() {
    const novoStatus = statusAtual === "STANDBY" ? "ATIVA" : "STANDBY";
    if (novoStatus === "STANDBY" && !confirm("Colocar essa tipologia em stand-by? Ela sai da fila de risco até ser reativada.")) {
      return;
    }
    setCarregando(true);
    try {
      await alterarStatusProducaoTipologia(tipologiaId, novoStatus);
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  if (statusAtual === "CONCLUIDA") return null;

  return (
    <button
      onClick={handleToggle}
      disabled={carregando}
      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary/50"
    >
      {carregando ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : statusAtual === "STANDBY" ? (
        <Play className="h-3 w-3" />
      ) : (
        <Pause className="h-3 w-3" />
      )}
      {statusAtual === "STANDBY" ? "Reativar" : "Stand-by"}
    </button>
  );
}
