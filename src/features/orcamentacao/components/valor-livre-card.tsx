"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { salvarValoresServico } from "@/features/orcamentacao/actions/valor-livre-actions";

interface Props {
  empreendimentoId: string;
  orcamentoId: string | null;
  totalUnidades: number;
  eletrico: number | null;
  hidraulico: number | null;
  qdc: number | null;
  kitsContratados: string[];
}

const LABEL: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Valores do serviço HGI — única forma de precificar desde 12/08/2026.
 * O preço é sempre negociado antes, então não faz sentido o sistema
 * calcular por área ou pontos de teto e depois ter o número
 * sobrescrito. Aqui a pessoa digita, e o sistema só multiplica pela
 * quantidade de unidades.
 */
export function ValorLivreCard({
  empreendimentoId,
  orcamentoId,
  totalUnidades,
  eletrico,
  hidraulico,
  qdc,
  kitsContratados,
}: Props) {
  const router = useRouter();
  const [valores, setValores] = React.useState<Record<string, string>>({
    ELETRICO: eletrico != null ? String(eletrico).replace(".", ",") : "",
    HIDRAULICO: hidraulico != null ? String(hidraulico).replace(".", ",") : "",
    QDC: qdc != null ? String(qdc).replace(".", ",") : "",
  });
  const [salvando, setSalvando] = React.useState(false);
  const [salvo, setSalvo] = React.useState(false);

  const parse = (v: string) => {
    const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  };

  const linhas = kitsContratados
    .map((kit) => ({ kit, valor: parse(valores[kit] ?? "") }))
    .filter((l) => l.valor != null && l.valor > 0)
    .map((l) => ({ ...l, total: l.valor! * totalUnidades }));

  const totalGeral = linhas.reduce((s, l) => s + l.total, 0);

  async function handleSalvar() {
    setSalvando(true);
    setSalvo(false);
    try {
      const r = await salvarValoresServico(
        empreendimentoId,
        orcamentoId,
        parse(valores.ELETRICO ?? ""),
        parse(valores.HIDRAULICO ?? ""),
        parse(valores.QDC ?? "")
      );
      if ("erro" in r) {
        alert(r.erro);
        return;
      }
      setSalvo(true);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Valores do serviço HGI</p>
        <span className="text-xs text-muted-foreground">{totalUnidades} unidades no empreendimento</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Digite o valor negociado de cada kit. O total é o valor multiplicado pela quantidade de unidades.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kitsContratados.map((kit) => (
          <div key={kit} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{LABEL[kit] ?? kit} (R$)</label>
            <input
              value={valores[kit] ?? ""}
              onChange={(e) => {
                setValores((p) => ({ ...p, [kit]: e.target.value }));
                setSalvo(false);
              }}
              inputMode="decimal"
              placeholder="0,00"
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
            />
          </div>
        ))}
      </div>

      {linhas.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-secondary/20 px-4 py-3">
          {linhas.map((l) => (
            <div key={l.kit} className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">
                {LABEL[l.kit] ?? l.kit}: {formatBRL(l.valor!)} × {totalUnidades} un.
              </span>
              <span className="tabular-nums font-medium text-foreground">{formatBRL(l.total)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total do serviço</span>
            <span className="tabular-nums text-base font-semibold text-primary">{formatBRL(totalGeral)}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {salvo && !salvando && <Check className="h-3.5 w-3.5" />}
        {salvo && !salvando ? "Valores salvos" : "Salvar valores"}
      </button>
    </div>
  );
}
