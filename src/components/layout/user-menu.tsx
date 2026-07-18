"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? "" : "";
  return (primeira + ultima).toUpperCase() || "?";
}

/**
 * Menu do usuário logado na topbar — avatar clicável que abre um dropdown
 * com nome, papel e opção de sair. É o ponto principal de logout do app.
 */
export function UserMenu() {
  const { data: session } = useSession();

  const nome = session?.user?.nome ?? session?.user?.name ?? "Usuário";
  const email = session?.user?.email ?? "";
  const papel = session?.user?.papeis?.[0] ?? "";
  const iniciais = getInitials(nome);

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login", redirect: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-secondary"
          aria-label="Menu do usuário"
        >
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="text-xs font-semibold">
              {iniciais}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{nome}</span>
            {email && (
              <span className="text-xs text-muted-foreground truncate">{email}</span>
            )}
            {papel && (
              <span className="text-xs text-primary font-medium">{papel}</span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Meu perfil</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
