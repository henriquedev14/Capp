"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";

import { StatusBadge } from "@/features/empreendimentos/components/status-badge";
import { TIPOS_EMPREENDIMENTO } from "@/features/empreendimentos/constants";
import type { EmpreendimentoResumo } from "@/core/empreendimentos/repositories/empreendimento-repository";

function labelTipo(tipo: string): string {
  return TIPOS_EMPREENDIMENTO.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatarRelativo(data: Date): string {
  const agora = new Date();
  const diffMs = agora.getTime() - new Date(data).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMin / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHoras < 24) return `há ${diffHoras}h`;
  if (diffDias === 1) return "ontem";
  if (diffDias < 30) return `há ${diffDias} dias`;
  return new Date(data).toLocaleDateString("pt-BR");
}

interface EmpreendimentosTableProps {
  empreendimentos: EmpreendimentoResumo[];
}

export function EmpreendimentosTable({ empreendimentos }: EmpreendimentosTableProps) {
  if (empreendimentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <Building2 className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum empreendimento encontrado
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ajuste os filtros ou cadastre um novo empreendimento
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
              Empreendimento
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
              Cidade / UF
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden xl:table-cell">
              Tipo
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
              Atualizado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {empreendimentos.map((emp) => (
            <tr key={emp.id} className="group hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-mono text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                    {emp.codigo}
                  </span>
                  <Link
                    href={`/empreendimentos/${emp.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {emp.nome}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                {emp.clienteNome}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                {emp.cidade} / {emp.estado}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                {labelTipo(emp.tipo)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={emp.status} />
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden sm:table-cell">
                {formatarRelativo(emp.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
