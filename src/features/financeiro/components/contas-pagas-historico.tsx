"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { desfazerPagamentoConta } from "@/features/financeiro/actions/conta-pagar-actions";

export interface ContaPagaItem {
  id: string;
  descricao: string;
  tipo: "FIXA" | "PARCELADA" | "AVULSA";
  valor: number;
  dataVencimento: string; // ISO
  pagoEm: string | null; // ISO
  parcelaAtual: number | null;
  parcelaTotal: number | null;
  empresaNome: string;
  categoriaNome: string;
}

interface Props {
  contas: ContaPagaItem[];
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}
function chaveDoMes(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function labelDoMes(chave: string): string {
  const partes = chave.split("-").map(Number);
  const ano = partes[0] ?? 0;
  const mes = partes[1] ?? 1;
  const label = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ContasPagasHistorico({ contas }: Props) {
  const router = useRouter();
  const [desfazendoId, setDesfazendoId] = React.useState<string | null>(null);

  async function handleDesfazer(id: string, descricao: string) {
    if (!confirm(`Desfazer pagamento de "${descricao}"? Ela volta pra Contas a Pagar como pendente.`)) return;
    setDesfazendoId(id);
    try {
      const r = await desfazerPagamentoConta(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setDesfazendoId(null);
    }
  }

  const grupos = React.useMemo(() => {
    const mapa = new Map<string, ContaPagaItem[]>();
    for (const c of contas) {
      const chave = chaveDoMes(c.dataVencimento);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(c);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // mês mais recente primeiro
      .map(([chave, itens]) => ({
        chave,
        label: labelDoMes(chave),
        itens: itens.sort((a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime()),
        total: itens.reduce((s, c) => s + c.valor, 0),
      }));
  }, [contas]);

  if (grupos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma conta paga ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <div key={grupo.chave} className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">{grupo.label}</h3>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {formatBRL(grupo.total)}
            </span>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col divide-y divide-border">
                {grupo.itens.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-foreground truncate">
                        {c.descricao}
                        {c.tipo === "PARCELADA" && c.parcelaAtual && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            ({c.parcelaAtual}/{c.parcelaTotal})
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {c.empresaNome} · {c.categoriaNome} · venceu {formatData(c.dataVencimento)}
                        {c.pagoEm && <> · pago em {formatData(c.pagoEm)}</>}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium uppercase text-success">
                        Paga
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(c.valor)}</span>
                      <button
                        onClick={() => handleDesfazer(c.id, c.descricao)}
                        disabled={desfazendoId === c.id}
                        className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
                        title="Desfazer pagamento (volta pra Contas a Pagar)"
                      >
                        {desfazendoId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
