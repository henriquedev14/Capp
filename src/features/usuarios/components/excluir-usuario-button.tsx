"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { excluirUsuario } from "@/features/usuarios/actions/usuario-actions";

interface Props {
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
}

// Exclusão definitiva — diferente de inativar (que só bloqueia login e
// mantém o histórico visível), isso remove o cadastro por completo. Exige
// digitar o e-mail exato pra confirmar, mesmo padrão usado na exclusão de
// Empreendimento — irreversível, sem letra miúda.
export function ExcluirUsuarioButton({ usuarioId, usuarioNome, usuarioEmail }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [confirmacao, setConfirmacao] = React.useState("");
  const [processando, setProcessando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const confirmacaoValida = confirmacao.trim().toLowerCase() === usuarioEmail.trim().toLowerCase();

  async function handleExcluir() {
    if (!confirmacaoValida) return;
    setErro(null);
    setProcessando(true);
    const resultado = await excluirUsuario(usuarioId);
    setProcessando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Excluir cadastro"
      >
        <Trash2 className="h-3.5 w-3.5" />
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
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h2 className="text-base font-semibold">Excluir cadastro</h2>
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
              Isso vai apagar o cadastro de <strong className="text-foreground">{usuarioNome}</strong> por
              completo — diferente de inativar, não dá pra desfazer. Orçamentos, propostas e
              documentos que ele criou continuam existindo, só perdem a referência de quem criou.
            </p>

            <p className="mt-4 text-xs font-medium text-muted-foreground">
              Digite <span className="font-mono text-foreground">{usuarioEmail}</span> para confirmar:
            </p>
            <input
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
              placeholder={usuarioEmail}
            />

            {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAberto(false)} disabled={processando}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleExcluir}
                disabled={!confirmacaoValida || processando}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {processando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-4 w-4" />
                )}
                Excluir definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
