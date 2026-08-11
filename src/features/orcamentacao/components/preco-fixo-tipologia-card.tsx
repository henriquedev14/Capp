"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  definirPrecoFixoTipologia,
  removerPrecoFixoTipologia,
  type PrecoFixoView,
} from "@/features/orcamentacao/actions/preco-fixo-actions";

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };

interface TipologiaComPrecos {
  id: string;
  nome: string;
  precosFixos: PrecoFixoView[];
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PrecoFixoTipologiaCard({
  tipologias,
  kitsDisponiveis,
}: {
  tipologias: TipologiaComPrecos[];
  kitsDisponiveis: string[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(true);
  const [editando, setEditando] = React.useState<{ tipologiaId: string; kit: string } | null>(null);
  const [valor, setValor] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const totalFixos = tipologias.reduce((s, t) => s + t.precosFixos.length, 0);

  async function handleSalvar() {
    if (!editando) return;
    const num = parseFloat(valor.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      alert("Valor inválido.");
      return;
    }
    setSalvando(true);
    try {
      const r = await definirPrecoFixoTipologia(editando.tipologiaId, editando.kit as never, num);
      if ("erro" in r) alert(r.erro);
      else {
        setEditando(null);
        setValor("");
        router.refresh();
      }
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(tipologiaId: string, kit: string) {
    if (!window.confirm("Remover o preço fixo? Volta a usar a regra normal (área/pontos).")) return;
    await removerPrecoFixoTipologia(tipologiaId, kit as never);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Preço fixo por Tipologia</span>
          {totalFixos > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {totalFixos} travado(s)
            </span>
          )}
        </div>
        {aberto ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {aberto && (
        <div className="border-t border-border px-5 py-4">
          <p className="mb-4 text-xs text-muted-foreground">
            Trava um valor na mão pra uma Tipologia+Kit específica, ignorando a regra de área/pontos de teto. Só
            vale pro próximo orçamento gerado.
          </p>
          <div className="flex flex-col gap-3">
            {tipologias.map((t) => (
              <div key={t.id} className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-medium text-foreground">{t.nome}</p>
                <div className="flex flex-wrap gap-2">
                  {kitsDisponiveis.map((kit) => {
                    const fixo = t.precosFixos.find((p) => p.kit === kit);
                    const estaEditando = editando?.tipologiaId === t.id && editando?.kit === kit;

                    if (estaEditando) {
                      return (
                        <div key={kit} className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{LABEL_KIT[kit]}</span>
                          <input
                            autoFocus
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="0,00"
                            className="h-7 w-20 rounded border border-input bg-background px-1.5 text-xs"
                          />
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSalvar} disabled={salvando}>
                            {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ok"}
                          </Button>
                          <button
                            onClick={() => {
                              setEditando(null);
                              setValor("");
                            }}
                            className="text-xs text-muted-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                      );
                    }

                    if (fixo) {
                      return (
                        <div
                          key={kit}
                          className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs"
                        >
                          <Lock className="h-3 w-3 text-primary" />
                          <span className="font-medium">{LABEL_KIT[kit]}:</span>
                          <span className="font-semibold text-primary">{formatBRL(fixo.valorUnitario)}</span>
                          <button
                            onClick={() => handleRemover(t.id, kit)}
                            className="ml-1 text-muted-foreground hover:text-destructive"
                            title="Remover"
                          >
                            <Unlock className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={kit}
                        onClick={() => {
                          setEditando({ tipologiaId: t.id, kit });
                          setValor("");
                        }}
                        className="rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
                      >
                        + Travar {LABEL_KIT[kit]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
