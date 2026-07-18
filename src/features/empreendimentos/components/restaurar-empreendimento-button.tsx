"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { restaurarEmpreendimento } from "@/features/empreendimentos/actions/empreendimento-actions";

/** [CORREÇÃO C2/C3.1] Reverte o arquivamento — volta às listagens operacionais. */
export function RestaurarEmpreendimentoButton({ empreendimentoId }: { empreendimentoId: string }) {
  const router = useRouter();
  const [processando, setProcessando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleRestaurar() {
    setErro(null);
    setProcessando(true);
    const resultado = await restaurarEmpreendimento(empreendimentoId);
    setProcessando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={handleRestaurar} disabled={processando}>
        {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Restaurar
      </Button>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
