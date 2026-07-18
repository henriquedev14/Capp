"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Boxes,
  Users,
  FileBarChart,
  Settings,
  Zap,
  LogOut,
  Factory,
  Truck,
  PackageCheck,
  Package,
  Calculator,
  ShieldCheck,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { label: "Analytics", icon: LayoutDashboard, href: "/painel" },
      { label: "Clientes", icon: Building2, href: "/clientes" },
      { label: "Empreendimentos", icon: Boxes, href: "/empreendimentos" },
    ],
  },
  {
    label: "Operação",
    items: [
      { label: "Orçamentação", icon: Calculator, href: "/orcamentacao" },
      { label: "Financeiro", icon: Wallet, href: "/financeiro" },
      { label: "Fornecedores", icon: Truck, href: "/fornecedores" },
      { label: "Produção", icon: Factory, href: "/producao" },
      { label: "Suprimentos", icon: Package, href: "/suprimentos" },
      { label: "Expedição", icon: PackageCheck, href: "/expedicao" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Pessoas", icon: Users, href: "/pessoas" },
      { label: "Papéis", icon: ShieldCheck, href: "/papeis" },
      { label: "Segurança", icon: ShieldAlert, href: "/seguranca" },
      { label: "Relatórios", icon: FileBarChart, href: "#" },
      { label: "Configurações", icon: Settings, href: "#" },
    ],
  },
] as const;

function getInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? "" : "";
  return (primeira + ultima).toUpperCase() || "?";
}

export function AppSidebar() {
  const { isCollapsed } = useSidebar();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const nomeUsuario = session?.user?.nome ?? session?.user?.name ?? "Carregando...";
  const papelPrincipal = session?.user?.papeis?.[0] ?? "";
  const iniciais = getInitials(nomeUsuario);

  async function handleSignOut() {
    try {
      await signOut({ callbackUrl: "/login", redirect: true });
    } catch {
      router.push("/api/auth/signout");
    }
  }

  function isActive(href: string) {
    if (href === "#") return false;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col transition-[width] duration-200",
        "h-screen sticky top-0 overflow-y-auto",
        // Light: fundo branco com borda direita
        // Dark: fundo escuro do design (#17130E)
        "bg-white border-r border-border",
        "dark:bg-[#17130E] dark:border-white/6",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo / Marca */}
      <div
        className={cn(
          "flex h-[68px] items-center gap-3",
          "border-b border-border dark:border-white/6",
          isCollapsed ? "justify-center px-3" : "px-5"
        )}
      >
        <div
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px]"
          style={{
            background: "linear-gradient(135deg, #FF8A2A, #FF5A00)",
            boxShadow: "0 8px 20px -6px rgba(255,106,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          <Zap className="h-6 w-6 text-white" fill="white" strokeWidth={0} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col leading-none">
            <span
              className="text-[19px] font-bold tracking-tight text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              Constru<span style={{ color: "#FF7A1A" }}>App</span>
            </span>
            <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-widest text-muted-foreground">
              by HGI Group
            </span>
          </div>
        )}
      </div>

      {/* Navegação com grupos */}
      <nav className={cn("flex flex-1 flex-col gap-5 p-3", isCollapsed && "items-center gap-3")}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={cn("flex flex-col gap-0.5", isCollapsed && "items-center")}>
            {!isCollapsed && (
              <span className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </span>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return isCollapsed ? (
                <Tooltip key={item.label} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      aria-label={item.label}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                        active
                          ? "dark:text-white text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                      style={active ? {
                        background: "linear-gradient(100deg, rgba(255,106,0,0.18), rgba(255,106,0,0.04))",
                        border: "1px solid rgba(255,138,40,0.25)",
                      } : {}}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground dark:text-white font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  style={active ? {
                    background: "linear-gradient(100deg, rgba(255,106,0,0.14), rgba(255,106,0,0.03))",
                    border: "1px solid rgba(255,138,40,0.22)",
                  } : {}}
                >
                  {active ? (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: "rgba(255,106,0,0.18)",
                        border: "1px solid rgba(255,138,40,0.28)",
                      }}
                    >
                      <item.icon className="h-[15px] w-[15px]" style={{ color: "#FF7A1A" }} />
                    </span>
                  ) : (
                    <item.icon className="h-[17px] w-[17px] shrink-0 text-muted-foreground" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Rodapé: usuário + toggle + logout */}
      <div
        className={cn(
          "border-t border-border dark:border-white/6 p-3",
          isCollapsed && "flex flex-col items-center gap-2"
        )}
      >
        {isCollapsed ? (
          <>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold border border-border bg-secondary text-foreground">
                  {iniciais}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{nomeUsuario}</TooltipContent>
            </Tooltip>
            <ThemeToggle />
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sair"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold border border-border bg-secondary text-foreground">
              {iniciais}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                {nomeUsuario}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {papelPrincipal || "Sem papel atribuído"}
              </span>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sair"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
