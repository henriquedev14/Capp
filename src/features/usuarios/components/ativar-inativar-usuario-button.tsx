"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Loader2 } from "lucide-react";

import { inativarUsuario, reativarUsuario } from "@/features/usuarios/actions/usuario-actions";

interface Props {
  usuarioId: string;
  ativo: boolean;
}

export function AtivarInativarUsuarioButton({ usuarioId, ativo }: Props) {
  const router = useRouter();
  const [processando, setProcessando] = React.useState(false);

  async function handleToggle() {
    if (!confirm(ativo ? "Inativar este usuário? Ele não conseguirá mais fazer login." : "Reativar este usuário?")) {
      return;
    }
    setProcessando(true);
    const resultado = ativo ? await inativarUsuario(usuarioId) : await reativarUsuario(usuarioId);
    setProcessando(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  return (
    <button
      onClick={handleToggle}
      disabled={processando}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        ativo
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-success/10 hover:text-success"
      }`}
      title={ativo ? "Inativar" : "Reativar"}
    >
      {processando ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : ativo ? (
        <PowerOff className="h-3.5 w-3.5" />
      ) : (
        <Power className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
