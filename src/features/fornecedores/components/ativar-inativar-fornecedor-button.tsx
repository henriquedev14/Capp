"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { inativarFornecedor, reativarFornecedor } from "@/features/fornecedores/actions/fornecedor-actions";

interface Props {
  fornecedorId: string;
  ativo: boolean;
}

export function AtivarInativarFornecedorButton({ fornecedorId, ativo }: Props) {
  const router = useRouter();
  const [processando, setProcessando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleToggle() {
    setErro(null);
    setProcessando(true);
    const resultado = ativo
      ? await inativarFornecedor(fornecedorId)
      : await reativarFornecedor(fornecedorId);
    setProcessando(false);
    if ("erro" in resultado) { setErro(resultado.erro); return; }
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
            className={ativo ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-success text-success hover:bg-success/10"}
          >
            {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {ativo ? "Inativar" : "Reativar"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {ativo
              ? "O fornecedor deixará de aparecer nas opções de cotação."
              : "O fornecedor voltará a aparecer normalmente."}
          </div>
          <DropdownMenuItem
            onClick={handleToggle}
            className={ativo ? "text-destructive focus:text-destructive" : "text-success focus:text-success"}
          >
            {ativo ? "Confirmar inativação" : "Confirmar reativação"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {erro && <span className="text-xs text-destructive max-w-[220px] text-right">{erro}</span>}
    </div>
  );
}
