"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/suprimentos", label: "Gestão", exato: true },
  { href: "/suprimentos/pedidos", label: "Pedidos de Compra" },
  { href: "/suprimentos/entrada", label: "Entrada de Material" },
  { href: "/suprimentos/importar-nota", label: "Importar Nota (PDF)" },
];

/** Navegação persistente do módulo Suprimentos — unificado com Almoxarifado/Recebimento. */
export function SuprimentosSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {ABAS.map((aba) => {
        const ativo = aba.exato ? pathname === aba.href : pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              ativo ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
