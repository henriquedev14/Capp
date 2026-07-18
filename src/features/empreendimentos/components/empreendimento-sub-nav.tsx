"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  empreendimentoId: string;
  kitEletrico: boolean;
  kitHidraulico: boolean;
}

/**
 * Navegação persistente entre as sub-páginas de um empreendimento — antes,
 * pra ir de "Levantamento de Materiais" pro "Levantamento Elétrico" era
 * preciso voltar pra página principal do empreendimento e começar de novo.
 * Isso fica fixo no topo em todas as sub-páginas (via layout.tsx), então
 * a troca é direta, sem voltar nada.
 */
export function EmpreendimentoSubNav({ empreendimentoId, kitEletrico, kitHidraulico }: Props) {
  const pathname = usePathname();
  const base = `/empreendimentos/${empreendimentoId}`;

  const abas = [
    { href: base, label: "Visão Geral", exato: true },
    kitEletrico && { href: `${base}/levantamento`, label: "Levantamento Elétrico" },
    kitHidraulico && { href: `${base}/levantamento-hidraulico`, label: "Levantamento Hidráulico" },
    { href: `${base}/levantamento-materiais`, label: "Levantamento de Materiais" },
    { href: `${base}/orcamento`, label: "Orçamento" },
    { href: `${base}/documentos`, label: "Documentos" },
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
