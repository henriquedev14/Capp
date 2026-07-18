"use client";

import * as React from "react";
import { MoreVertical } from "lucide-react";

/**
 * Menu de ações secundárias — separa ações destrutivas (Excluir) das
 * ações principais (Editar, Avançar etapa). Antes, "Excluir" ficava
 * lado a lado com "Editar" com o mesmo peso visual, o que é perigoso:
 * um clique errado tinha a mesma facilidade de um clique seguro.
 */
export function MenuAcoesSecundarias({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary/50"
        aria-label="Mais ações"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {aberto && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-48 rounded-lg border border-border bg-card p-1 shadow-lg"
          onClick={() => setAberto(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
