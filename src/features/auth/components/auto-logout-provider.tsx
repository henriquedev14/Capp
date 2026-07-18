"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";

import { registrarLogoutPorInatividade } from "@/features/auth/actions/registrar-logout-inatividade";

// 30 minutos sem nenhuma interação = desloga sozinho.
const MINUTOS_INATIVIDADE = 30;
const MS_INATIVIDADE = MINUTOS_INATIVIDADE * 60 * 1000;
// Confere a cada 30s se já passou do limite — em vez de confiar num único
// setTimeout de 30 minutos. Navegadores atrasam de propósito timers longos
// em abas em segundo plano (economia de bateria), o que fazia esse recurso
// parecer quebrado quando na verdade só estava atrasado. Comparar contra
// Date.now() a cada checagem corrige isso, porque não importa se a
// checagem em si atrasou um pouco — o tempo real decorrido continua correto.
const INTERVALO_CHECAGEM_MS = 30 * 1000;
const EVENTOS_DE_ATIVIDADE = ["mousemove", "keydown", "click", "scroll", "touchstart", "visibilitychange"] as const;

export function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const ultimaAtividadeRef = React.useRef<number>(Date.now());
  const deslogandoRef = React.useRef(false);

  React.useEffect(() => {
    if (status !== "authenticated") return;

    function marcarAtividade() {
      ultimaAtividadeRef.current = Date.now();
    }

    marcarAtividade();
    for (const evento of EVENTOS_DE_ATIVIDADE) {
      window.addEventListener(evento, marcarAtividade, { passive: true });
    }

    const intervalo = setInterval(async () => {
      if (deslogandoRef.current) return;
      const decorrido = Date.now() - ultimaAtividadeRef.current;
      if (decorrido >= MS_INATIVIDADE) {
        deslogandoRef.current = true;
        // Registra o motivo do logout ANTES de sair — depois de signOut,
        // a sessão já não existe mais pra esse fetch identificar quem era.
        await registrarLogoutPorInatividade();
        await signOut({ callbackUrl: "/login" });
      }
    }, INTERVALO_CHECAGEM_MS);

    return () => {
      clearInterval(intervalo);
      for (const evento of EVENTOS_DE_ATIVIDADE) {
        window.removeEventListener(evento, marcarAtividade);
      }
    };
  }, [status]);

  return <>{children}</>;
}
