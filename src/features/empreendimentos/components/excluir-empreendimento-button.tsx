"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, X, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { arquivarEmpreendimento } from "@/features/empreendimentos/actions/empreendimento-actions";

interface Props {
  empreendimentoId: string;
  empreendimentoNome: string;
}

/**
 * [CORREÇÃO C2/C3.1] Antes fazia exclusão física irreversível — agora
 * arquiva (soft-delete via excluidoEm/excluidoPorId). Nada é apagado:
 * documentos, financeiro, orçamentos e histórico continuam intactos, só
 * saem das listagens operacionais. Reversível a qualquer momento.
 */
export function ExcluirEmpreendimentoButton({ empreendimentoId, empreendimentoNome }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [processando, setProcessando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleArquivar() {
    setErro(null);
    setProcessando(true);
    const resultado = await arquivarEmpreendimento(empreendimentoId);
    setProcessando(false);

    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    router.push("/empreendimentos");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
      >
        <Archive className="h-4 w-4" />
        Arquivar empreendimento
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !processando && setAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground">
                <Archive className="h-5 w-5 shrink-0 text-destructive" />
                <h2 className="text-base font-semibold">Arquivar empreendimento</h2>
              </div>
              <button
                onClick={() => setAberto(false)}
                disabled={processando}
                className="rounded p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              <strong className="text-foreground">{empreendimentoNome}</strong> vai sair das
              listagens e operações ativas (orçamentos, produção, expedição etc.).
            </p>

            <ul className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                Documentos, financeiro e histórico são preservados — nada é apagado
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                A ação pode ser revertida a qualquer momento (restaurar)
              </li>
            </ul>

            {erro && <p className="mt-3 text-xs text-destructive">{erro}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAberto(false)} disabled={processando}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleArquivar}
                disabled={processando}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {processando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-1.5 h-4 w-4" />
                )}
                Arquivar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
