"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { CadastroLegadoForm } from "@/features/empreendimentos/components/cadastro-legado-form";

/**
 * Escolhe entre o cadastro normal (que o caller já renderiza como
 * children, por padrão) e o cadastro Legado simplificado — sem mexer
 * no formulário grande que já existe. Pedido pelo Henrique em
 * 13/08/2026: "desde o começo já mostre a opção do legado".
 */
export function SeletorTipoCadastro({
  clientesAtivos,
  children,
}: {
  clientesAtivos: Array<{ value: string; label: string }>;
  children: React.ReactNode;
}) {
  const [legado, setLegado] = React.useState(false);

  return (
    <div className="flex flex-col gap-5">
      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3">
        <input
          type="checkbox"
          checked={legado}
          onChange={(e) => setLegado(e.target.checked)}
          className="h-4 w-4 accent-warning"
        />
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span className="text-sm font-medium text-foreground">
          Este é um empreendimento Legado (obra de antes do sistema — sem levantamento, sem planilha, sem orçamento)
        </span>
      </label>

      {legado ? <CadastroLegadoForm clientesAtivos={clientesAtivos} /> : children}
    </div>
  );
}
