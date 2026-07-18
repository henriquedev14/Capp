"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, ShieldCheck, Lock, Loader2 } from "lucide-react";

import { excluirPapel } from "@/features/papeis/actions/papel-actions";
import type { PapelGestao } from "@/core/auth/repositories/papel-repository";

export function PapeisTable({ papeis }: { papeis: PapelGestao[] }) {
  const router = useRouter();
  const [excluindoId, setExcluindoId] = React.useState<string | null>(null);

  async function handleExcluir(papel: PapelGestao) {
    if (!confirm(`Excluir o papel "${papel.nome}"?`)) return;
    setExcluindoId(papel.id);
    const resultado = await excluirPapel(papel.id);
    setExcluindoId(null);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Papel</th>
            <th className="px-4 py-3 font-medium">Permissões</th>
            <th className="px-4 py-3 font-medium">Usuários</th>
            <th className="px-4 py-3 font-medium w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {papeis.map((papel) => (
            <tr key={papel.id} className="hover:bg-secondary/20">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{papel.nome}</span>
                  {papel.protegido && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Lock className="h-2.5 w-2.5" />
                      Protegido
                    </span>
                  )}
                </div>
                {papel.descricao && (
                  <span className="text-xs text-muted-foreground">{papel.descricao}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {papel.permissoes.length} permissões
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{papel.totalUsuarios}</td>
              <td className="px-4 py-3">
                {!papel.protegido && (
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/papeis/${papel.id}/editar`}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleExcluir(papel)}
                      disabled={excluindoId === papel.id}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      {excluindoId === papel.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
