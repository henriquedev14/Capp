"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  salvarKitsLegado,
  desativarModoLegado,
  calcularValorUnitarioBaseContratoLegado,
  type KitLegadoInput,
  type BaselineFinanceiroInput,
} from "@/features/empreendimentos/actions/legado-actions";

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };
const KITS_DISPONIVEIS = ["ELETRICO", "HIDRAULICO", "QDC"] as const;

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface LinhaKit {
  kit: "ELETRICO" | "HIDRAULICO" | "QDC";
  quantidadeContratada: string;
  quantidadeEntregueHistorico: string;
}

interface Props {
  empreendimentoId: string;
  ativoInicial: boolean;
  baselineInicial: { valorContratado: number | null; faturadoHistorico: number | null; recebidoHistorico: number | null; quantidadeBaseUnidades: number | null };
  kitsIniciais: Array<{ kit: string; quantidadeContratada: number; quantidadeEntregueHistorico: number }>;
}

/**
 * Modo Legado — ativa direto no cadastro do empreendimento. Modelagem
 * final revisada com o Henrique em 13/08/2026: financeiro fica no
 * empreendimento (baseline único), não repartido por kit.
 */
export function ModoLegadoCard({ empreendimentoId, ativoInicial, baselineInicial, kitsIniciais }: Props) {
  const router = useRouter();
  const [ativo, setAtivo] = React.useState(ativoInicial);

  const [valorContratado, setValorContratado] = React.useState(
    baselineInicial.valorContratado != null ? String(baselineInicial.valorContratado).replace(".", ",") : ""
  );
  const [faturadoHistorico, setFaturadoHistorico] = React.useState(
    baselineInicial.faturadoHistorico != null ? String(baselineInicial.faturadoHistorico).replace(".", ",") : ""
  );
  const [recebidoHistorico, setRecebidoHistorico] = React.useState(
    baselineInicial.recebidoHistorico != null ? String(baselineInicial.recebidoHistorico).replace(".", ",") : ""
  );
  const [quantidadeBaseUnidades, setQuantidadeBaseUnidades] = React.useState(
    baselineInicial.quantidadeBaseUnidades != null ? String(baselineInicial.quantidadeBaseUnidades) : ""
  );

  const [linhas, setLinhas] = React.useState<LinhaKit[]>(
    kitsIniciais.length > 0
      ? kitsIniciais.map((k) => ({
          kit: k.kit as LinhaKit["kit"],
          quantidadeContratada: String(k.quantidadeContratada),
          quantidadeEntregueHistorico: String(k.quantidadeEntregueHistorico),
        }))
      : [{ kit: "ELETRICO", quantidadeContratada: "", quantidadeEntregueHistorico: "" }]
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
    const usados = linhas.map((l) => l.kit);
    const proximo = KITS_DISPONIVEIS.find((k) => !usados.includes(k));
    if (!proximo) return;
    setLinhas((prev) => [...prev, { kit: proximo, quantidadeContratada: "", quantidadeEntregueHistorico: "" }]);
  }

  function removerLinha(i: number) {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  }

  const valorUnitario = calcularValorUnitarioBaseContratoLegado(
    parseNum(valorContratado),
    parseNum(quantidadeBaseUnidades)
  );

  async function handleAtivar() {
    setErro(null);
    const baseline: BaselineFinanceiroInput = {
      valorContratado: parseNum(valorContratado),
      faturadoHistorico: parseNum(faturadoHistorico),
      recebidoHistorico: parseNum(recebidoHistorico),
      quantidadeBaseUnidades: parseNum(quantidadeBaseUnidades),
    };
    const kits: KitLegadoInput[] = linhas.map((l) => ({
      kit: l.kit,
      quantidadeContratada: parseNum(l.quantidadeContratada),
      quantidadeEntregueHistorico: parseNum(l.quantidadeEntregueHistorico),
    }));
    setSalvando(true);
    try {
      const r = await salvarKitsLegado(empreendimentoId, baseline, kits);
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
          Pra obras que já estavam em andamento antes do sistema existir — entra direto em Produção.
        </p>

        <p className="mb-2 text-xs font-semibold text-foreground">Contrato</p>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-[11px] text-muted-foreground">Valor total (R$)</label>
            <input value={valorContratado} onChange={(e) => setValorContratado(e.target.value)} inputMode="decimal" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Qtd. base de unidades</label>
            <input value={quantidadeBaseUnidades} onChange={(e) => setQuantidadeBaseUnidades(e.target.value)} inputMode="numeric" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Faturado histórico (R$)</label>
            <input value={faturadoHistorico} onChange={(e) => setFaturadoHistorico(e.target.value)} inputMode="decimal" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Recebido histórico (R$)</label>
            <input value={recebidoHistorico} onChange={(e) => setRecebidoHistorico(e.target.value)} inputMode="decimal" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
          </div>
        </div>
        {valorUnitario != null && (
          <p className="mb-4 text-xs text-muted-foreground">
            Valor estimado por unidade-base: <span className="font-medium text-foreground">{formatBRL(valorUnitario)}</span>{" "}
            (80% do contrato ÷ quantidade-base — não é o valor de cada kit separado)
          </p>
        )}

        <p className="mb-2 text-xs font-semibold text-foreground">Kits contratados</p>
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground">Qtd. contratada</label>
                <input value={linha.quantidadeContratada} onChange={(e) => atualizarLinha(i, "quantidadeContratada", e.target.value)} inputMode="numeric" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Já entregues (histórico)</label>
                <input value={linha.quantidadeEntregueHistorico} onChange={(e) => atualizarLinha(i, "quantidadeEntregueHistorico", e.target.value)} inputMode="numeric" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
              </div>
            </div>
          </div>
        ))}

        {linhas.length < KITS_DISPONIVEIS.length && (
          <button onClick={adicionarLinha} className="mb-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
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
