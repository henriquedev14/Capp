"use client";

import * as React from "react";

interface SidebarContextValue {
  isCollapsed: boolean;
  toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "constructapp:sidebar-collapsed";

/**
 * Provider do estado de colapso da sidebar. Vive no layout principal do
 * grupo (main), envolvendo tanto a sidebar quanto a topbar — é o que
 * permite que o botão de menu (☰) na topbar controle a sidebar sem que
 * elas precisem se conhecer diretamente.
 *
 * A preferência do usuário é lembrada entre sessões via localStorage.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsCollapsed(true);
    }
    setIsHydrated(true);
  }, []);

  const toggle = React.useCallback(() => {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // Evita "flash" da sidebar expandida antes de ler a preferência salva.
  const value = React.useMemo(
    () => ({ isCollapsed: isHydrated ? isCollapsed : false, toggle }),
    [isCollapsed, isHydrated, toggle]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar deve ser usado dentro de <SidebarProvider>");
  }
  return context;
}
