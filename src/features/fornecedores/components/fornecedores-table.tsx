"use client";

import Link from "next/link";
import { Truck, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TipoBadgeList } from "@/features/fornecedores/components/tipo-badge";
import type { FornecedorResumo } from "@/core/fornecedores/entities/fornecedor";

function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

interface FornecedoresTableProps {
  fornecedores: FornecedorResumo[];
}

export function FornecedoresTable({ fornecedores }: FornecedoresTableProps) {
  if (fornecedores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <Truck className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum fornecedor encontrado
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ajuste os filtros ou cadastre um novo fornecedor
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
              Fornecedor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              CNPJ
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
              Cidade / UF
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Tipos
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {fornecedores.map((f) => (
            <tr key={f.id} className="group hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-mono text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                    {f.codigo}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <Link
                      href={`/fornecedores/${f.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {f.nomeFantasia ?? f.razaoSocial}
                    </Link>
                    {f.nomeFantasia && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {f.razaoSocial}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell tabular-nums">
                {formatarCnpj(f.cnpj)}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                {f.cidade && f.estado
                  ? `${f.cidade} / ${f.estado}`
                  : f.cidade ?? f.estado ?? "—"}
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <TipoBadgeList tipos={f.tipos} max={2} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                    f.ativo
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      f.ativo ? "bg-success" : "bg-muted-foreground"
                    )}
                  />
                  {f.ativo ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link href={`/fornecedores/${f.id}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  >
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
