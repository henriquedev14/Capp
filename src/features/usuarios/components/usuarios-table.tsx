import Link from "next/link";
import { Pencil } from "lucide-react";

import { AtivarInativarUsuarioButton } from "@/features/usuarios/components/ativar-inativar-usuario-button";
import { ExcluirUsuarioButton } from "@/features/usuarios/components/excluir-usuario-button";
import { ExigirDuploFatorButton } from "@/features/usuarios/components/exigir-duplo-fator-button";
import type { Usuario } from "@/core/auth/entities/usuario";

function getInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? "" : "";
  return (primeira + ultima).toUpperCase() || "?";
}

export function UsuariosTable({ usuarios }: { usuarios: Usuario[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Usuário</th>
            <th className="px-4 py-3 font-medium">Papéis</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {usuarios.map((u) => (
            <tr key={u.id} className="hover:bg-secondary/20">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                    {getInitials(u.nome)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{u.nome}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {u.papeis.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Sem papel</span>
                  ) : (
                    u.papeis.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {p.nome}
                      </span>
                    ))
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${u.ativo ? "bg-success" : "bg-muted-foreground"}`} />
                  {u.ativo ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/pessoas/${u.id}/editar`}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <AtivarInativarUsuarioButton usuarioId={u.id} ativo={u.ativo} />
                  <ExigirDuploFatorButton usuarioId={u.id} exigido={u.duploFatorObrigatorio} />
                  <ExcluirUsuarioButton usuarioId={u.id} usuarioNome={u.nome} usuarioEmail={u.email} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
