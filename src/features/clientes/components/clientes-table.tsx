"use client";

import Link from "next/link";
import { Building2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TierBadge } from "@/features/tiers/components/tier-badge";
import type { ClienteResumo } from "@/core/clientes/entities/cliente";

function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

interface ClientesTableProps {
  clientes: ClienteResumo[];
}

export function ClientesTable({ clientes }: ClientesTableProps) {
  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <Building2 className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhuma construtora encontrada
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ajuste os filtros ou cadastre uma nova construtora
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Construtora
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              CNPJ
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
              Cidade / UF
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Tier
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
              Empr.
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clientes.map((cliente) => (
            <tr key={cliente.id} className="group hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-mono text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                    {cliente.codigo}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {cliente.nomeFantasia ?? cliente.razaoSocial}
                    </Link>
                    {cliente.nomeFantasia && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {cliente.razaoSocial}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell tabular-nums">
                {formatarCnpj(cliente.cnpj)}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                {cliente.cidade && cliente.estado
                  ? `${cliente.cidade} / ${cliente.estado}`
                  : cliente.cidade ?? cliente.estado ?? "—"}
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <TierBadge tier={cliente.tier} fallback="sem-tier" />
              </td>
              <td className="px-4 py-3 text-center hidden sm:table-cell">
                <span className="text-muted-foreground">{cliente.totalEmpreendimentos}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                    cliente.ativo
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      cliente.ativo ? "bg-success" : "bg-muted-foreground"
                    )}
                  />
                  {cliente.ativo ? "Ativa" : "Inativa"}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link href={`/clientes/${cliente.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
