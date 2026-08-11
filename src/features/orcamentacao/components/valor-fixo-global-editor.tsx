"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { atualizarValorFixoGlobal } from "@/features/orcamentacao/actions/precos-actions";

interface Props {
  eletrico: number | null;
  hidraulico: number | null;
  qdc: number | null;
  podeEditar: boolean;
}

export function ValorFixoGlobalEditor({ eletrico, hidraulico, qdc, podeEditar }: Props) {
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
      const r = await atualizarValorFixoGlobal(parse(valores.eletrico), parse(valores.hidraulico), parse(valores.qdc));
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-1 text-sm font-semibold text-foreground">Valores fixos (padrão global)</p>
      <p className="mb-4 text-xs text-muted-foreground">
        Usado quando um empreendimento está com o critério "Valor fixo" mas não definiu um valor próprio.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo label="Elétrico (R$)" valor={valores.eletrico} onChange={(v) => setValores((p) => ({ ...p, eletrico: v }))} disabled={!podeEditar} />
        <Campo label="Hidráulico (R$)" valor={valores.hidraulico} onChange={(v) => setValores((p) => ({ ...p, hidraulico: v }))} disabled={!podeEditar} />
        <Campo label="QDC (R$)" valor={valores.qdc} onChange={(v) => setValores((p) => ({ ...p, qdc: v }))} disabled={!podeEditar} />
      </div>
      {podeEditar && (
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvar valores
        </button>
      )}
    </div>
  );
}

function Campo({
  label,
  valor,
  onChange,
  disabled,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="0,00"
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      />
    </div>
  );
}
