"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { criarOrcamento } from "@/features/orcamentacao/actions/orcamento-actions";

interface NovoOrcamentoButtonProps {
  empreendimentoId: string;
  tier: number;
}

export function NovoOrcamentoButton({
  empreendimentoId,
  tier,
}: NovoOrcamentoButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setErro(null);
    const result = await criarOrcamento(empreendimentoId, { tier });
    if ("erro" in result) {
      setErro(result.erro);
      setLoading(false);
    } else {
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleClick} disabled={loading} size="sm">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Nova revisão
      </Button>
      {erro && (
        <p className="text-xs text-destructive max-w-xs text-right">{erro}</p>
      )}
    </div>
  );
}
