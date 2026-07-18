"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { atualizarMetasPorArea, type MetasPorArea } from "@/features/financeiro/actions/cadastros-actions";

const CAMPOS: { chave: keyof MetasPorArea; label: string }[] = [
  { chave: "comercial", label: "Comercial (prospecção)" },
  { chave: "engenharia", label: "Engenharia (levantamento)" },
  { chave: "orcamentacao", label: "Orçamentação (proposta)" },
  { chave: "producao", label: "Suprimentos/Produção (lead time total)" },
];

/**
 * Editor de metas de tempo por área — sem isso, o scorecard de
 * Desempenho das Áreas só conseguia dizer "tem dado" ou "não tem",
 * nunca se o tempo medido era bom ou ruim. Com meta cadastrada, vira
 * status de verdade (saudável/atenção/crítico).
 */
export function MetasAreasEditor({ metasIniciais }: { metasIniciais: MetasPorArea }) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [valores, setValores] = React.useState<Record<string, string>>(
    Object.fromEntries(CAMPOS.map((c) => [c.chave, metasIniciais[c.chave]?.toString() ?? ""]))
  );
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleSalvar() {
    setErro(null);
    setSalvando(true);
    try {
      const metas: MetasPorArea = {
        comercial: valores.comercial ? Number(valores.comercial) : null,
        engenharia: valores.engenharia ? Number(valores.engenharia) : null,
        orcamentacao: valores.orcamentacao ? Number(valores.orcamentacao) : null,
        producao: valores.producao ? Number(valores.producao) : null,
      };
      const r = await atualizarMetasPorArea(metas);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Definir metas de tempo por área
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        Meta em dias por área — deixa em branco se ainda não quiser definir.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CAMPOS.map((campo) => (
          <div key={campo.chave} className="flex items-center justify-between gap-2">
            <label className="text-xs text-foreground">{campo.label}</label>
            <input
              type="text"
              inputMode="decimal"
              value={valores[campo.chave]}
              onChange={(e) => setValores((prev) => ({ ...prev, [campo.chave]: e.target.value }))}
              placeholder="dias"
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-right text-sm"
            />
          </div>
        ))}
      </div>
      {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleSalvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
