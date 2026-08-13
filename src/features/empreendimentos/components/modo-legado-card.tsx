"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { salvarKitsLegado, desativarModoLegado, type KitLegadoInput } from "@/features/empreendimentos/actions/legado-actions";

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };
const KITS_DISPONIVEIS = ["ELETRICO", "HIDRAULICO", "QDC"] as const;

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface LinhaKit {
  kit: "ELETRICO" | "HIDRAULICO" | "QDC";
  quantidadeTotal: string;
  quantidadeEntregue: string;
  valorContrato: string;
  valorFaturado: string;
}

interface Props {
  empreendimentoId: string;
  ativoInicial: boolean;
  kitsIniciais: Array<{ kit: string; quantidadeTotal: number; quantidadeAprovada: number; valorContrato: number; valorFaturadoInicial: number }>;
}

/**
 * Modo Legado — ativa direto no cadastro do empreendimento. Pra obras
 * que já estavam em andamento antes do ConstruApp existir: pula
 * levantamento, orçamento e suprimentos, e entra direto com os
 * números que já existiam. Desenhado com o Henrique em 12-13/08/2026.
 */
export function ModoLegadoCard({ empreendimentoId, ativoInicial, kitsIniciais }: Props) {
  const router = useRouter();
  const [ativo, setAtivo] = React.useState(ativoInicial);
  const [linhas, setLinhas] = React.useState<LinhaKit[]>(
    kitsIniciais.length > 0
      ? kitsIniciais.map((k) => ({
          kit: k.kit as LinhaKit["kit"],
          quantidadeTotal: String(k.quantidadeTotal),
          quantidadeEntregue: String(k.quantidadeAprovada),
          valorContrato: String(k.valorContrato).replace(".", ","),
          valorFaturado: String(k.valorFaturadoInicial).replace(".", ","),
        }))
      : [{ kit: "ELETRICO", quantidadeTotal: "", quantidadeEntregue: "", valorContrato: "", valorFaturado: "" }]
  );
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  function parseNum(v: string): number {
    const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function atualizarLinha(i: number, campo: keyof LinhaKit, valor: string) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  function adicionarLinha() {
    const kitsUsados = linhas.map((l) => l.kit);
    const proximoKit = KITS_DISPONIVEIS.find((k) => !kitsUsados.includes(k));
    if (!proximoKit) return;
    setLinhas((prev) => [...prev, { kit: proximoKit, quantidadeTotal: "", quantidadeEntregue: "", valorContrato: "", valorFaturado: "" }]);
  }

  function removerLinha(i: number) {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleAtivar() {
    setErro(null);
    const kits: KitLegadoInput[] = linhas.map((l) => ({
      kit: l.kit,
      quantidadeTotal: parseNum(l.quantidadeTotal),
      quantidadeEntregue: parseNum(l.quantidadeEntregue),
      valorContrato: parseNum(l.valorContrato),
      valorFaturado: parseNum(l.valorFaturado),
    }));
    setSalvando(true);
    try {
      const r = await salvarKitsLegado(empreendimentoId, kits);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setAtivo(true);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function handleDesativar() {
    if (!window.confirm("Desativar o Modo Legado? Os dados já cadastrados continuam guardados — só sai da flag.")) return;
    setSalvando(true);
    try {
      await desativarModoLegado(empreendimentoId);
      setAtivo(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-xl border border-warning/40 bg-card">
      <div className="flex items-center justify-between border-b border-warning/30 bg-warning/5 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">Modo Legado</span>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => (e.target.checked ? null : handleDesativar())}
            disabled={salvando}
            className="h-4 w-4 accent-warning"
          />
          {ativo ? "Ativo" : "Inativo"}
        </label>
      </div>

      <div className="px-5 py-4">
        <p className="mb-4 text-xs text-muted-foreground">
          Pra obras que já estavam em andamento antes do sistema existir — pula levantamento, orçamento e
          suprimentos. Cria a Ordem de Produção e a Conta a Receber direto, com os números que já existiam.
        </p>

        {linhas.map((linha, i) => (
          <div key={i} className="mb-3 rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <select
                value={linha.kit}
                onChange={(e) => atualizarLinha(i, "kit", e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
              >
                {KITS_DISPONIVEIS.map((k) => (
                  <option key={k} value={k}>
                    {LABEL_KIT[k]}
                  </option>
                ))}
              </select>
              {linhas.length > 1 && (
                <button onClick={() => removerLinha(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="text-[11px] text-muted-foreground">Qtd. total</label>
                <input
                  value={linha.quantidadeTotal}
                  onChange={(e) => atualizarLinha(i, "quantidadeTotal", e.target.value)}
                  inputMode="numeric"
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Já entregues</label>
                <input
                  value={linha.quantidadeEntregue}
                  onChange={(e) => atualizarLinha(i, "quantidadeEntregue", e.target.value)}
                  inputMode="numeric"
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Contrato (R$)</label>
                <input
                  value={linha.valorContrato}
                  onChange={(e) => atualizarLinha(i, "valorContrato", e.target.value)}
                  inputMode="decimal"
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Já faturado (R$)</label>
                <input
                  value={linha.valorFaturado}
                  onChange={(e) => atualizarLinha(i, "valorFaturado", e.target.value)}
                  inputMode="decimal"
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                />
              </div>
            </div>
            {parseNum(linha.quantidadeTotal) > 0 && parseNum(linha.valorContrato) > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Valor por kit: {formatBRL(parseNum(linha.valorContrato) / parseNum(linha.quantidadeTotal))} · Faltam
                produzir: {parseNum(linha.quantidadeTotal) - parseNum(linha.quantidadeEntregue)} · Falta faturar:{" "}
                {formatBRL(parseNum(linha.valorContrato) - parseNum(linha.valorFaturado))}
              </p>
            )}
          </div>
        ))}

        {linhas.length < KITS_DISPONIVEIS.length && (
          <button
            onClick={adicionarLinha}
            className="mb-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar outro kit
          </button>
        )}

        {erro && <p className="mb-3 text-xs text-destructive">{erro}</p>}

        <button
          onClick={handleAtivar}
          disabled={salvando}
          className="flex items-center gap-1.5 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:opacity-90 disabled:opacity-60"
        >
          {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {ativo ? "Atualizar dados do Legado" : "Ativar Modo Legado"}
        </button>
      </div>
    </div>
  );
}
