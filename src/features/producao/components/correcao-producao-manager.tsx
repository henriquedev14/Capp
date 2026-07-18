"use client";

import * as React from "react";
import { Loader2, Pencil, Check, X, Trash2 } from "lucide-react";

import { corrigirRegistroProducao, excluirRegistroProducao } from "@/features/producao/actions/producao-actions";

interface Registro {
  id: string;
  operadorNome: string;
  empreendimentoNome: string;
  tipologiaNome: string;
  bancadaNome: string;
  unidadeMedida: "METROS" | "PECAS";
  pecaLabel: string;
  unidadesConcluidas: number;
  quantidade: number;
  corrigido: boolean;
  createdAt: Date;
}

function formatDataHora(d: Date): string {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function CorrecaoProducaoManager({ registrosIniciais }: { registrosIniciais: Registro[] }) {
  const [registros, setRegistros] = React.useState(registrosIniciais);
  const [editandoId, setEditandoId] = React.useState<string | null>(null);
  const [valorEmEdicao, setValorEmEdicao] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  function iniciarEdicao(r: Registro) {
    setEditandoId(r.id);
    setValorEmEdicao(String(r.unidadesConcluidas));
    setErro(null);
  }

  async function handleSalvar(id: string) {
    const novoValor = Number(valorEmEdicao.replace(",", "."));
    if (!novoValor || novoValor <= 0) {
      setErro("Digite uma quantidade válida.");
      return;
    }
    setSalvando(true);
    try {
      const r = await corrigirRegistroProducao(id, novoValor);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      // Recalcula a proporção localmente pra refletir na tela sem esperar
      // um reload — a quantidade bruta escala junto com as unidades.
      setRegistros((prev) =>
        prev.map((reg) => {
          if (reg.id !== id) return reg;
          const fator = reg.unidadesConcluidas > 0 ? novoValor / reg.unidadesConcluidas : 1;
          return { ...reg, unidadesConcluidas: novoValor, quantidade: reg.quantidade * fator, corrigido: true };
        })
      );
      setEditandoId(null);
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir esse registro de produção? Não dá pra desfazer.")) return;
    const r = await excluirRegistroProducao(id);
    if ("erro" in r) {
      alert(r.erro);
      return;
    }
    setRegistros((prev) => prev.filter((reg) => reg.id !== id));
  }

  if (registros.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nenhum registro nos últimos 7 dias.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Quando</th>
              <th className="px-3 py-2 text-left font-medium">Operador</th>
              <th className="px-3 py-2 text-left font-medium">Bancada</th>
              <th className="px-3 py-2 text-left font-medium">Obra / Tipologia / Peça</th>
              <th className="px-3 py-2 text-right font-medium">Unidades</th>
              <th className="px-3 py-2 text-right font-medium">Quantidade</th>
              <th className="px-3 py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {registros.map((r) => (
              <tr key={r.id} className={r.corrigido ? "bg-warning/5" : ""}>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDataHora(r.createdAt)}</td>
                <td className="px-3 py-2 text-foreground">{r.operadorNome}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.bancadaNome}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.empreendimentoNome} / {r.tipologiaNome} / {r.pecaLabel}
                </td>
                <td className="px-3 py-2 text-right">
                  {editandoId === r.id ? (
                    <input
                      type="text"
                      value={valorEmEdicao}
                      onChange={(e) => setValorEmEdicao(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSalvar(r.id)}
                      autoFocus
                      className="h-8 w-20 rounded-md border border-input bg-background px-2 text-right text-sm"
                    />
                  ) : (
                    <span className="tabular-nums text-foreground">{r.unidadesConcluidas}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {r.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                  {r.unidadeMedida === "METROS" ? "m" : "pç"}
                  {r.corrigido && <span className="ml-1 text-xs text-warning">(corrigido)</span>}
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {salvando && editandoId === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {editandoId === r.id ? (
                      <>
                        <button onClick={() => handleSalvar(r.id)} className="rounded-md p-1.5 text-success hover:bg-success/10">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditandoId(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => iniciarEdicao(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleExcluir(r.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
