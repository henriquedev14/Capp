"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { atualizarSaldoCaixaAtual } from "@/features/financeiro/actions/fluxo-caixa-actions";
import type { SemanaProjetada } from "@/features/financeiro/lib/fluxo-caixa";

interface Props {
  saldoAtual: number;
  semanas: SemanaProjetada[];
  podeEditar: boolean;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FluxoCaixaView({ saldoAtual, semanas, podeEditar }: Props) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [valor, setValor] = React.useState(String(saldoAtual));
  const [salvando, setSalvando] = React.useState(false);

  async function salvar() {
    const novo = Number(valor.replace(",", "."));
    if (!Number.isFinite(novo)) {
      alert("Valor inválido.");
      return;
    }
    setSalvando(true);
    const r = await atualizarSaldoCaixaAtual(novo);
    setSalvando(false);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  const primeiraSemanaNegativa = semanas.find((s) => s.saldoAcumulado < 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-5">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo em caixa agora
            </span>
            {editando ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvar()}
                  autoFocus
                  className="w-40 rounded-lg border border-input bg-background px-2 py-1 text-lg font-bold tabular-nums"
                />
                <button onClick={salvar} disabled={salvando} className="rounded p-1 text-success hover:bg-success/10">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button onClick={() => setEditando(false)} className="rounded p-1 text-muted-foreground hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatBRL(saldoAtual)}</div>
            )}
          </div>
          {podeEditar && !editando && (
            <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" />
              Ajustar
            </Button>
          )}
        </CardContent>
      </Card>

      {primeiraSemanaNegativa && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Atenção:</strong> na semana de {primeiraSemanaNegativa.label} o saldo projetado fica
            negativo ({formatBRL(primeiraSemanaNegativa.saldoAcumulado)}) — considere antecipar
            recebíveis ou renegociar vencimentos antes disso.
          </span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Semana</th>
                <th className="px-4 py-2 text-right font-medium">Entradas</th>
                <th className="px-4 py-2 text-right font-medium">Saídas</th>
                <th className="px-4 py-2 text-right font-medium">Saldo da semana</th>
                <th className="px-4 py-2 text-right font-medium">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {semanas.map((s, i) => (
                <tr key={i} className={s.saldoAcumulado < 0 ? "bg-destructive/5" : undefined}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{s.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-success">
                    {s.entradas > 0 ? `+${formatBRL(s.entradas)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-destructive">
                    {s.saidas > 0 ? `-${formatBRL(s.saidas)}` : "—"}
                  </td>
                  <td className={"px-4 py-2.5 text-right tabular-nums font-medium " + (s.saldoSemana < 0 ? "text-destructive" : "text-foreground")}>
                    {formatBRL(s.saldoSemana)}
                  </td>
                  <td className={"px-4 py-2.5 text-right tabular-nums font-semibold " + (s.saldoAcumulado < 0 ? "text-destructive" : "text-primary")}>
                    {formatBRL(s.saldoAcumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
