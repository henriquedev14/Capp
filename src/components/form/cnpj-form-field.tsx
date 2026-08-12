"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface CamposParaPreencher {
  razaoSocial?: string;
  nomeFantasia?: string;
  telefone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

interface Props<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label?: string;
  required?: boolean;
  /** Mapa: nome do campo dos dados vindos da API → nome do campo do
   * formulário. Ex: { razaoSocial: "razaoSocial", telefone: "telefone" } */
  mapeamento: Partial<Record<keyof CamposParaPreencher, Path<TFieldValues>>>;
}

/**
 * Campo de CNPJ com busca automática — preenche outros campos do
 * formulário a partir da Receita Federal (via BrasilAPI). Pedido pelo
 * Henrique em 11/08/2026.
 */
export function CnpjFormField<TFieldValues extends FieldValues>({
  form,
  name,
  label = "CNPJ",
  required,
  mapeamento,
}: Props<TFieldValues>) {
  const [buscando, setBuscando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function buscarCnpj() {
    const valor = form.getValues(name) as string;
    const limpo = (valor ?? "").replace(/\D/g, "");
    if (limpo.length !== 14) {
      setErro("Digite um CNPJ completo (14 dígitos) antes de buscar.");
      return;
    }
    setErro(null);
    setBuscando(true);
    try {
      const resp = await fetch(`/api/cnpj/${limpo}`);
      const dados = await resp.json();
      if (!resp.ok) {
        setErro(dados.erro ?? "Não foi possível buscar esse CNPJ.");
        return;
      }
      for (const [chaveApi, campoForm] of Object.entries(mapeamento) as [keyof CamposParaPreencher, Path<TFieldValues>][]) {
        const valorApi = dados[chaveApi];
        if (valorApi != null && campoForm) {
          form.setValue(campoForm, valorApi as never, { shouldDirty: true, shouldValidate: true });
        }
      }
    } catch {
      setErro("Erro ao buscar o CNPJ. Tenta de novo.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && <span className="ml-0.5 text-primary">*</span>}
          </FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input {...field} placeholder="00.000.000/0000-00" maxLength={18} inputMode="numeric" />
            </FormControl>
            <button
              type="button"
              onClick={buscarCnpj}
              disabled={buscando}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-input bg-secondary px-3 text-sm font-medium text-foreground hover:bg-secondary/80 disabled:opacity-60"
              title="Buscar dados na Receita Federal"
            >
              {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
