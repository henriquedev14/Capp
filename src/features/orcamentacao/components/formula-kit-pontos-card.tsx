"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { atualizarFormulaKitPontos } from "@/features/orcamentacao/actions/precos-actions";

interface Props {
  valorMinimo: number;
  pontosInclusos: number;
  valorPorPontoExtra: number;
  podeEditar: boolean;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FormulaKitPontosCard({ valorMinimo, pontosInclusos, valorPorPontoExtra, podeEditar }: Props) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [minimo, setMinimo] = React.useState(String(valorMinimo));
  const [inclusos, setInclusos] = React.useState(String(pontosInclusos));
  const [porPonto, setPorPonto] = React.useState(String(valorPorPontoExtra));
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function salvar() {
    setErro(null);
    const v = Number(minimo.replace(",", "."));
    const p = parseInt(inclusos, 10);
    const e = Number(porPonto.replace(",", "."));
    if (!Number.isFinite(v) || !Number.isInteger(p) || !Number.isFinite(e)) {
      setErro("Valores inválidos.");
      return;
    }
    setSalvando(true);
    const r = await atualizarFormulaKitPontos({ valorMinimo: v, pontosInclusos: p, valorPorPontoExtra: e });
    setSalvando(false);
    if ("erro" in r) {
      setErro(r.erro);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Fórmula do kit (por Pontos de Teto)</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Substitui as antigas 4 faixas — agora é uma conta só, mais fácil de entender e ajustar.
          </p>
        </div>
        {podeEditar && !editando && (
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>

      {editando ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Valor mínimo (R$)</label>
              <input
                value={minimo}
                onChange={(e) => setMinimo(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Pontos inclusos</label>
              <input
                value={inclusos}
                onChange={(e) => setInclusos(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Valor / ponto extra (R$)</label>
              <input
                value={porPonto}
                onChange={(e) => setPorPonto(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditando(false)} disabled={salvando}>
              <X className="h-3.5 w-3.5" />
              Cancelar
            </Button>
            <Button size="sm" onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/40 px-4 py-3 text-sm text-foreground">
          <span className="font-mono font-semibold">{formatBRL(valorMinimo)}</span>
          <span className="text-muted-foreground">fixo até</span>
          <span className="font-mono font-semibold">{pontosInclusos} pontos</span>
          <span className="text-muted-foreground">+</span>
          <span className="font-mono font-semibold">{formatBRL(valorPorPontoExtra)}</span>
          <span className="text-muted-foreground">por cada ponto acima disso</span>
        </div>
      )}
    </div>
  );
}
