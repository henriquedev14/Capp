"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PowerOff, Power, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { inativarCliente, reativarCliente } from "@/features/clientes/actions/cliente-actions";

interface AtivarInativarClienteButtonProps {
  clienteId: string;
  ativo: boolean;
}

/**
 * Botão de ativar/inativar construtora com confirmação em duas etapas.
 * Apenas usuários com a permissão cliente:ativar_inativar conseguem
 * executar a ação — caso contrário, a Server Action retorna erro e
 * exibimos a mensagem inline.
 */
export function InativarClienteButton({ clienteId, ativo }: AtivarInativarClienteButtonProps) {
  const router = useRouter();
  const [processando, setProcessando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleToggle() {
    setErro(null);
    setProcessando(true);
    const resultado = ativo
      ? await inativarCliente(clienteId)
      : await reativarCliente(clienteId);
    setProcessando(false);

    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={processando}
            className={ativo ? "" : "border-success text-success hover:bg-success/10"}
          >
            {processando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : ativo ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {ativo ? "Inativar" : "Reativar"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {ativo ? (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                A construtora deixará de aparecer no seletor de empreendimentos.
                Empreendimentos já vinculados não são afetados e o histórico é preservado.
              </div>
              <DropdownMenuItem
                onClick={handleToggle}
                className="text-destructive focus:text-destructive"
              >
                <PowerOff className="h-4 w-4" />
                Confirmar inativação
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                A construtora voltará a aparecer no seletor de empreendimentos
                e poderá receber novos empreendimentos.
              </div>
              <DropdownMenuItem onClick={handleToggle} className="text-success focus:text-success">
                <Power className="h-4 w-4" />
                Confirmar reativação
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {erro && (
        <span className="text-xs text-destructive max-w-[240px] text-right">{erro}</span>
      )}
    </div>
  );
}
