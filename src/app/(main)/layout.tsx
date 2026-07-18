import { Bell, Search } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarToggleButton } from "@/components/layout/sidebar-toggle-button";
import { UserMenu } from "@/components/layout/user-menu";
import { MensagemMotivacional } from "@/components/layout/mensagem-motivacional";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/hooks/use-sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="flex min-h-screen bg-secondary/30">
          <div className="print:hidden">
            <AppSidebar />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="print:hidden sticky top-0 z-30 flex h-[68px] items-center justify-between gap-4 border-b border-border bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-8">
              <div className="flex flex-1 items-center gap-3">
                <SidebarToggleButton />
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empreendimentos, clientes..."
                    className="border-transparent bg-secondary pl-9 shadow-none focus-visible:border-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Notificações"
                >
                  <Bell className="h-[18px] w-[18px]" />
                </button>
                <UserMenu />
              </div>
            </header>

            <main className="flex-1 px-6 py-8 sm:px-8">
              <div className="mx-auto max-w-5xl">{children}</div>
            </main>
          </div>
        </div>
        <MensagemMotivacional />
      </TooltipProvider>
    </SidebarProvider>
  );
}
