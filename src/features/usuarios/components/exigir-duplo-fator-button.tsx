"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";

import { alternarDuploFatorObrigatorio } from "@/features/usuarios/actions/usuario-actions";

interface Props {
  usuarioId: string;
  exigido: boolean;
}

export function ExigirDuploFatorButton({ usuarioId, exigido }: Props) {
  const router = useRouter();
  const [processando, setProcessando] = React.useState(false);

  async function alternar() {
    setProcessando(true);
    try {
      const r = await alternarDuploFatorObrigatorio(usuarioId);
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <button
      onClick={alternar}
      disabled={processando}
      title={exigido ? "2FA obrigatório — clique pra tornar opcional" : "Tornar 2FA obrigatório pra este usuário"}
      className={
        "flex h-7 w-7 items-center justify-center rounded transition-colors " +
        (exigido
          ? "text-warning hover:bg-warning/10"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground")
      }
    >
      {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
    </button>
  );
}
