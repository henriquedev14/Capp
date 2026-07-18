"use client";

import * as React from "react";
import { X, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { redefinirSenha } from "@/features/usuarios/actions/usuario-actions";

interface Props {
  usuarioId: string;
  aberto: boolean;
  onFechar: () => void;
}

export function RedefinirSenhaDialog({ usuarioId, aberto, onFechar }: Props) {
  const [novaSenha, setNovaSenha] = React.useState("");
  const [mostrar, setMostrar] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState(false);

  if (!aberto) return null;

  async function handleSalvar() {
    if (novaSenha.length < 8) {
      setErro("Mínimo de 8 caracteres.");
      return;
    }
    setErro(null);
    setSalvando(true);
    const resultado = await redefinirSenha(usuarioId, { novaSenha });
    setSalvando(false);
    if ("erro" in resultado) { setErro(resultado.erro); return; }
    setSucesso(true);
    setNovaSenha("");
    setTimeout(() => {
      setSucesso(false);
      onFechar();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            Redefinir senha
          </h2>
          <button onClick={onFechar} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sucesso ? (
          <p className="text-sm text-success py-4 text-center">✓ Senha atualizada com sucesso.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Nova senha</label>
              <div className="relative">
                <input
                  type={mostrar ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {erro && <span className="text-xs text-destructive">{erro}</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              O usuário precisará usar esta nova senha no próximo login.
            </p>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSalvar} disabled={salvando} className="flex-1">
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>
              <Button variant="outline" onClick={onFechar}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
