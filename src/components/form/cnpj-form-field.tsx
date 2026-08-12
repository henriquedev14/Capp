"use client";

import * as React from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
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
  mapeamento: Partial<Record<keyof CamposParaPreencher, Path<TFieldValues>>>;
}

/** 12345678000190 → 12.345.678/0001-90 (formata parcial enquanto digita) */
function aplicarMascara(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

type Estado = { tipo: "parado" } | { tipo: "buscando" } | { tipo: "ok"; nome: string } | { tipo: "erro"; msg: string };

/**
 * Campo de CNPJ com máscara e busca automática — assim que os 14
 * dígitos são digitados, busca sozinho na Receita Federal e preenche
 * os outros campos. Sem botão pra clicar. Pedido pelo Henrique em
 * 11-12/08/2026.
 */
export function CnpjFormField<TFieldValues extends FieldValues>({
  form,
  name,
  label = "CNPJ",
  required,
  mapeamento,
}: Props<TFieldValues>) {
  const [estado, setEstado] = React.useState<Estado>({ tipo: "parado" });
  const ultimoBuscado = React.useRef<string>("");

  const buscar = React.useCallback(
    async (digitos: string) => {
      if (digitos === ultimoBuscado.current) return;
      ultimoBuscado.current = digitos;
      setEstado({ tipo: "buscando" });
      try {
        const resp = await fetch(`/api/cnpj/${digitos}`);
        const dados = await resp.json();
        if (!resp.ok) {
          setEstado({ tipo: "erro", msg: dados.erro ?? "Não foi possível consultar agora." });
          return;
        }
        let preenchidos = 0;
        for (const [chaveApi, campoForm] of Object.entries(mapeamento) as [keyof CamposParaPreencher, Path<TFieldValues>][]) {
          const valorApi = dados[chaveApi];
          if (valorApi != null && valorApi !== "" && campoForm) {
            form.setValue(campoForm, valorApi as never, { shouldDirty: true, shouldValidate: true });
            preenchidos++;
          }
        }
        setEstado({
          tipo: "ok",
          nome: dados.razaoSocial ?? `${preenchidos} campo(s) preenchido(s)`,
        });
      } catch {
        setEstado({ tipo: "erro", msg: "Erro de conexão ao consultar. Preenche na mão ou tenta de novo." });
      }
    },
    [form, mapeamento]
  );

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const digitos = String(field.value ?? "").replace(/\D/g, "");

        return (
          <FormItem>
            <FormLabel>
              {label}
              {required && <span className="ml-0.5 text-primary">*</span>}
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                — preenche sozinho ao completar
              </span>
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  {...field}
                  value={aplicarMascara(String(field.value ?? ""))}
                  onChange={(e) => {
                    const mascarado = aplicarMascara(e.target.value);
                    field.onChange(mascarado);
                    const d = mascarado.replace(/\D/g, "");
                    if (d.length === 14) buscar(d);
                    else if (estado.tipo !== "parado") setEstado({ tipo: "parado" });
                  }}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  className="pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {estado.tipo === "buscando" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {estado.tipo === "ok" && <Check className="h-4 w-4 text-success" />}
                  {estado.tipo === "erro" && <AlertCircle className="h-4 w-4 text-warning" />}
                </span>
              </div>
            </FormControl>

            {estado.tipo === "buscando" && (
              <p className="text-[11.5px] text-muted-foreground">Consultando a Receita Federal...</p>
            )}
            {estado.tipo === "ok" && (
              <p className="text-[11.5px] text-success">Encontrado: {estado.nome}</p>
            )}
            {estado.tipo === "erro" && (
              <div className="flex items-start gap-1.5 rounded-md bg-warning/10 px-2.5 py-2">
                <p className="text-[11.5px] leading-relaxed text-warning">
                  {estado.msg}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      ultimoBuscado.current = "";
                      if (digitos.length === 14) buscar(digitos);
                    }}
                    className="font-semibold underline"
                  >
                    Tentar de novo
                  </button>
                </p>
              </div>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
