"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { salvarValoresLivre } from "@/features/orcamentacao/actions/valor-livre-actions";

interface Props {
  empreendimentoId: string;
  eletrico: number | null;
  hidraulico: number | null;
  qdc: number | null;
}

export function ValorLivreCard({ empreendimentoId, eletrico, hidraulico, qdc }: Props) {
  const router = useRouter();
  const [valores, setValores] = React.useState({
    eletrico: eletrico != null ? String(eletrico) : "",
    hidraulico: hidraulico != null ? String(hidraulico) : "",
    qdc: qdc != null ? String(qdc) : "",
  });
  const [salvando, setSalvando] = React.useState(false);

  async function handleSalvar() {
    setSalvando(true);
    try {
      const parse = (v: string) => (v.trim() ? parseFloat(v.replace(",", ".")) : null);
      const r = await salvarValoresLivre(empreendimentoId, parse(valores.eletrico), parse(valores.hidraulico), parse(valores.qdc));
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-5">
      <p className="mb-1 text-sm font-semibold text-foreground">Critério Livre — valores por kit</p>
      <p className="mb-4 text-xs text-muted-foreground">
        Cada valor é multiplicado pela quantidade TOTAL de unidades desse empreendimento — não varia por tipologia,
        área ou pontos de teto, e não aplica o multiplicador de Tier.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo label="Elétrico (R$)" valor={valores.eletrico} onChange={(v) => setValores((p) => ({ ...p, eletrico: v }))} />
        <Campo label="Hidráulico (R$)" valor={valores.hidraulico} onChange={(v) => setValores((p) => ({ ...p, hidraulico: v }))} />
        <Campo label="QDC (R$)" valor={valores.qdc} onChange={(v) => setValores((p) => ({ ...p, qdc: v }))} />
      </div>
      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Salvar valores
      </button>
    </div>
  );
}

function Campo({ label, valor, onChange }: { label: string; valor: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0,00"
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      />
    </div>
  );
}
