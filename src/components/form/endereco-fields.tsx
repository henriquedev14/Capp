"use client";

import * as React from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

type CepStatus = "idle" | "buscando" | "encontrado" | "nao_encontrado" | "erro";

interface EnderecoFieldsProps {
  /** Valores atuais dos campos (lidos do react-hook-form via getValues/watch) */
  cep: string;
  logradouro: string;
  numero: string;
  cidade: string;
  estado: string;
  /** Callback chamado pelo componente para atualizar um campo no formulário pai */
  onChange: (campo: "cep" | "logradouro" | "numero" | "cidade" | "estado", valor: string) => void;
  /** Opções de estado para o select (passadas pelo formulário pai para não duplicar a lista) */
  estadosBR: { value: string; label: string }[];
}

/**
 * Bloco de campos de endereço com busca automática por CEP.
 *
 * CEP aparece primeiro. Ao completar 8 dígitos, faz fetch na API pública
 * do ViaCEP e preenche logradouro, cidade e estado automaticamente —
 * todos ficam editáveis após o preenchimento. Campo de número fica
 * separado, ao lado do CEP.
 *
 * Usa callbacks simples em vez de tentar tipar genericamente o
 * react-hook-form com templates de formulários diferentes (Cliente vs
 * Empreendimento têm schemas distintos). O formulário pai chama
 * form.setValue() dentro do onChange.
 */
export function EnderecoFields({
  cep,
  logradouro,
  numero,
  cidade,
  estado,
  onChange,
  estadosBR,
}: EnderecoFieldsProps) {
  const [status, setStatus] = React.useState<CepStatus>("idle");
  const abortRef = React.useRef<AbortController | null>(null);

  async function handleCepChange(valor: string) {
    onChange("cep", valor);

    const digits = valor.replace(/\D/g, "");
    if (digits.length !== 8) {
      if (status !== "idle") setStatus("idle");
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStatus("buscando");

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: abortRef.current.signal,
      });
      if (!resp.ok) { setStatus("erro"); return; }

      const dados = await resp.json();
      if (dados.erro) { setStatus("nao_encontrado"); return; }

      setStatus("encontrado");
      const logradouroCompleto = [dados.logradouro, dados.bairro]
        .filter(Boolean)
        .join(", ");
      onChange("logradouro", logradouroCompleto);
      onChange("cidade", dados.localidade ?? "");
      onChange("estado", dados.uf ?? "");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setStatus("erro");
    }
  }

  return (
    <div className="sm:col-span-2 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* CEP — primeiro campo, desencadeia preenchimento automático */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">CEP</label>
          <div className="relative">
            <Input
              placeholder="00000-000"
              maxLength={9}
              inputMode="numeric"
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
            />
            {status === "buscando" && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {status === "encontrado" && (
              <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-success" />
            )}
            {(status === "nao_encontrado" || status === "erro") && (
              <XCircle className="absolute right-2.5 top-2.5 h-4 w-4 text-destructive" />
            )}
          </div>
          {status === "nao_encontrado" && (
            <p className="text-xs text-destructive">CEP não encontrado — preencha manualmente.</p>
          )}
        </div>

        {/* Número — campo separado, ao lado do CEP */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Número</label>
          <Input
            placeholder="Ex: 123, S/N"
            value={numero}
            onChange={(e) => onChange("numero", e.target.value)}
          />
        </div>
      </div>

      {/* Logradouro — preenchido pelo CEP, editável */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Logradouro
          {status === "encontrado" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              preenchido automaticamente — edite se necessário
            </span>
          )}
        </label>
        <Input
          placeholder="Rua, Avenida, bairro..."
          value={logradouro}
          onChange={(e) => onChange("logradouro", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Cidade</label>
          <Input
            placeholder="Ex: Uberlândia"
            value={cidade}
            onChange={(e) => onChange("cidade", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Estado</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            value={estado}
            onChange={(e) => onChange("estado", e.target.value)}
          >
            <option value="">UF</option>
            {estadosBR.map((uf) => (
              <option key={uf.value} value={uf.value}>
                {uf.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
