"use client";

import { Menu } from "lucide-react";

import { useSidebar } from "@/hooks/use-sidebar";

/**
 * Botão de menu (☰) na topbar que alterna o estado de colapso da sidebar.
 * Fica fora da AppSidebar de propósito — é assim que o controle de
 * recolher/expandir permanece visível mesmo quando a sidebar está
 * compacta (só ícones).
 */
export function SidebarToggleButton() {
  const { isCollapsed, toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex"
      aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      aria-pressed={isCollapsed}
    >
      <Menu className="h-[18px] w-[18px]" />
    </button>
  );
}
