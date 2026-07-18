"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { ShieldAlert } from "lucide-react";

/**
 * Página intermediária pra quando a sessão foi invalidada por causa de
 * login em outro dispositivo (sessão única). O middleware redireciona
 * pra cá em vez de direto pro /login, porque o signOut de verdade (que
 * limpa o cookie/JWT) só pode acontecer no client — se só redirecionasse
 * pro /login sem isso, o cookie antigo ficaria pra trás e o middleware
 * ia continuar detectando "sessaoInvalida" pra sempre.
 */
export default function SessaoEncerradaPage() {
  React.useEffect(() => {
    signOut({ callbackUrl: "/login?sessaoEncerrada=1" });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-secondary/30 px-4 text-center">
      <ShieldAlert className="h-10 w-10 text-warning" />
      <p className="text-sm text-muted-foreground">
        Sua sessão foi encerrada porque detectamos um login em outro dispositivo. Redirecionando...
      </p>
    </div>
  );
}
