"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  podeVerGestao: boolean;
  podeCorrigir: boolean;
}

/**
 * Navegação persistente do módulo Produção — Gestão é a tela principal
 * (raiz de /producao), o resto vive como aba fixa ao lado. Resolve o
 * mesmo problema que já tínhamos resolvido no Empreendimento: antes,
 * cada sub-página só tinha o breadcrumb pra voltar, e algumas pessoas
 * relataram continuar se perdendo mesmo depois da correção do
 * breadcrumb — uma barra sempre visível é mais robusta que um link de
 * texto no canto.
 */
export function ProducaoSubNav({ podeVerGestao, podeCorrigir }: Props) {
  const pathname = usePathname();

  const abas = [
    podeVerGestao && { href: "/producao", label: "Gestão", exato: true },
    { href: "/producao/tablet", label: "Lançar Produção" },
    podeVerGestao && { href: "/producao/pedidos", label: "Pedidos Liberados" },
    podeCorrigir && { href: "/producao/correcao", label: "Corrigir Registros" },
    { href: "/producao/operadores", label: "Operadores" },
  ].filter(Boolean) as { href: string; label: string; exato?: boolean }[];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {abas.map((aba) => {
        const ativo = aba.exato ? pathname === aba.href : pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              ativo
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
