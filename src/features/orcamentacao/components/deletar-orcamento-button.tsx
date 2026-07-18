"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deletarOrcamento } from "@/features/orcamentacao/actions/orcamento-actions";

interface DeletarOrcamentoButtonProps {
  orcamentoId: string;
  empreendimentoId: string;
}

export function DeletarOrcamentoButton({
  orcamentoId,
  empreendimentoId,
}: DeletarOrcamentoButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Excluir este rascunho? Esta ação não pode ser desfeita.")) return;
    setLoading(true);
    const result = await deletarOrcamento(orcamentoId, empreendimentoId);
    if (result?.erro) {
      alert(result.erro);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      disabled={loading}
      onClick={handleClick}
      title="Excluir rascunho"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
