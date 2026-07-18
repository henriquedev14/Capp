"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";

import {
  atualizarPrecoBase,
  atualizarTierMultiplicador,
  atualizarFaixaPreco,
} from "@/features/orcamentacao/actions/precos-actions";
import type { TabelaPrecoBase, TierMultiplicador } from "@/core/orcamentacao/entities/orcamento";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const KIT_LABEL: Record<string, string> = {
  ELETRICO: "Elétrico",
  HIDRAULICO: "Hidráulico",
  QDC: "QDC",
};

// Faixa (mín–máx) editável — clique no lápis, edita os dois números juntos.
function FaixaEditavel({
  id,
  areaMin,
  areaMax,
  unidade,
}: {
  id: string;
  areaMin: number;
  areaMax: number;
  unidade: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [min, setMin] = React.useState(String(areaMin));
  const [max, setMax] = React.useState(areaMax >= 999 ? "" : String(areaMax));
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function confirmar() {
    const minNum = parseFloat(min.replace(",", "."));
    const maxNum = max.trim() === "" ? 999 : parseFloat(max.replace(",", "."));
    if (isNaN(minNum) || isNaN(maxNum)) {
      setErro("Números inválidos");
      return;
    }
    setSalvando(true);
    setErro(null);
    const resultado = await atualizarFaixaPreco(id, minNum, maxNum);
    setSalvando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="group flex items-center gap-1.5 rounded px-2 py-1 hover:bg-secondary transition-colors"
      >
        <span className="text-muted-foreground">
          {areaMin} — {areaMax >= 999 ? "∞" : areaMax} {unidade}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="mín"
          className="w-16 rounded border border-primary bg-background px-1.5 py-1 text-xs font-mono focus:outline-none"
        />
        <span className="text-xs text-muted-foreground">a</span>
        <input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirmar()}
          placeholder="máx (vazio = ∞)"
          className="w-24 rounded border border-primary bg-background px-1.5 py-1 text-xs font-mono focus:outline-none"
        />
        <span className="text-xs text-muted-foreground">{unidade}</span>
        <button onClick={confirmar} disabled={salvando} className="text-success hover:bg-success/10 rounded p-1">
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => setEditando(false)} className="text-muted-foreground hover:bg-secondary rounded p-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {erro && <span className="text-xs text-destructive">{erro}</span>}
    </div>
  );
}

// Célula de valor editável — clique no lápis, edita, confirma com ✓.
function ValorEditavel({
  valor,
  formatado,
  onSalvar,
  sufixo,
}: {
  valor: number;
  formatado: string;
  onSalvar: (novo: number) => Promise<{ ok: true } | { erro: string }>;
  sufixo?: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [texto, setTexto] = React.useState(String(valor));
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function confirmar() {
    const novo = parseFloat(texto.replace(",", "."));
    if (isNaN(novo)) { setErro("Número inválido"); return; }
    setSalvando(true);
    setErro(null);
    const resultado = await onSalvar(novo);
    setSalvando(false);
    if ("erro" in resultado) { setErro(resultado.erro); return; }
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <button
        onClick={() => { setEditando(true); setTexto(String(valor)); }}
        className="group flex items-center gap-1.5 rounded px-2 py-1 hover:bg-secondary transition-colors"
      >
        <span className="font-mono font-medium">{formatado}</span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirmar(); if (e.key === "Escape") setEditando(false); }}
          className="w-24 rounded border border-primary bg-background px-2 py-1 text-sm font-mono focus:outline-none"
        />
        {sufixo && <span className="text-xs text-muted-foreground">{sufixo}</span>}
        <button onClick={confirmar} disabled={salvando} className="text-success hover:bg-success/10 rounded p-1">
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => setEditando(false)} className="text-muted-foreground hover:bg-secondary rounded p-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {erro && <span className="text-xs text-destructive">{erro}</span>}
    </div>
  );
}

export function TabelaPrecosEditavel({ precos }: { precos: TabelaPrecoBase[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Kit</th>
          <th className="py-2 pr-4 font-medium">Faixa</th>
          <th className="py-2 pr-4 font-medium">Descrição</th>
          <th className="py-2 font-medium">Preço {precos[0]?.criterio === "PONTOS_TETO" ? "por ponto" : "base"}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {precos.map((p) => (
          <tr key={p.id} className="hover:bg-secondary/20">
            <td className="py-2.5 pr-4 font-medium">{KIT_LABEL[p.kit] ?? p.kit}</td>
            <td className="py-2.5 pr-4">
              <FaixaEditavel
                id={p.id}
                areaMin={p.areaMin}
                areaMax={p.areaMax}
                unidade={p.criterio === "PONTOS_TETO" ? "pontos" : "m²"}
              />
            </td>
            <td className="py-2.5 pr-4 text-muted-foreground">{p.descricao}</td>
            <td className="py-2.5">
              <ValorEditavel
                valor={p.precoBase}
                formatado={formatBRL(p.precoBase)}
                onSalvar={(novo) => atualizarPrecoBase(p.id, novo)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TabelaTiersEditavel({ tiers }: { tiers: TierMultiplicador[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Tier</th>
          <th className="py-2 pr-4 font-medium">Descrição</th>
          <th className="py-2 font-medium">Multiplicador</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {tiers.map((t) => (
          <tr key={t.id} className="hover:bg-secondary/20">
            <td className="py-2.5 pr-4 font-medium">{t.nome}</td>
            <td className="py-2.5 pr-4 text-muted-foreground">{t.descricao ?? "—"}</td>
            <td className="py-2.5">
              <ValorEditavel
                valor={t.multiplicador}
                formatado={`× ${t.multiplicador.toFixed(2)}`}
                sufixo="×"
                onSalvar={(novo) => atualizarTierMultiplicador(t.id, novo)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
