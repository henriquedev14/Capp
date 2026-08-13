"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { atualizarValorItemTabelaPreco } from "@/features/fornecedores/actions/tabela-preco-actions";

interface Item {
  id: string;
  descricao: string;
  marca: string;
  unidade: string;
  valorUnitario: number;
  prazoEntrega: string | null;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Tabela de Preços Ativa do fornecedor, direto na página principal —
 * os itens importados (de planilha ou sincronizados via cotação)
 * ficam visíveis sem precisar entrar em sub-página, e editáveis
 * individualmente. Pedido pelo Henrique em 12/08/2026: "os itens são
 * só importados pra base, não aparecem em nenhum campo".
 */
export function TabelaPrecoAtivaCard({
  fornecedorId,
  nome,
  vigenciaInicio,
  vigenciaFim,
  itens,
}: {
  fornecedorId: string;
  nome: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  itens: Item[];
}) {
  const [busca, setBusca] = React.useState("");

  const itensFiltrados = busca.trim()
    ? itens.filter((i) => i.descricao.toLowerCase().includes(busca.toLowerCase()))
    : itens;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Tabela de Preços Ativa — {nome}</p>
          <p className="text-xs text-muted-foreground">
            Vigência {formatData(vigenciaInicio)} – {formatData(vigenciaFim)} · {itens.length} item(ns) · clique num
            valor pra editar
          </p>
        </div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar item..."
          className="h-8 w-48 rounded-lg border border-input bg-background px-3 text-xs"
        />
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Descrição</th>
              <th className="px-2 py-2 text-left font-medium">Marca</th>
              <th className="px-2 py-2 text-left font-medium">Prazo</th>
              <th className="px-4 py-2 text-right font-medium">Valor Unit.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {itensFiltrados.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2">{item.descricao}</td>
                <td className="px-2 py-2 text-muted-foreground">{item.marca}</td>
                <td className="px-2 py-2 text-muted-foreground">{item.prazoEntrega ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <ValorEditavel itemId={item.id} fornecedorId={fornecedorId} valorAtual={item.valorUnitario} />
                </td>
              </tr>
            ))}
            {itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ValorEditavel({ itemId, fornecedorId, valorAtual }: { itemId: string; fornecedorId: string; valorAtual: number }) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [valor, setValor] = React.useState(String(valorAtual).replace(".", ","));
  const [salvando, setSalvando] = React.useState(false);

  async function salvar() {
    const num = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(num) || num <= 0 || num === valorAtual) {
      setValor(String(valorAtual).replace(".", ","));
      setEditando(false);
      return;
    }
    setSalvando(true);
    try {
      await atualizarValorItemTabelaPreco(itemId, fornecedorId, num);
      router.refresh();
    } finally {
      setSalvando(false);
      setEditando(false);
    }
  }

  if (editando) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {salvando && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={salvar}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setValor(String(valorAtual).replace(".", ","));
              setEditando(false);
            }
          }}
          disabled={salvando}
          className="h-7 w-24 rounded border border-primary/40 bg-background px-2 text-right text-sm tabular-nums outline-none"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditando(true)}
      className="tabular-nums text-foreground hover:text-primary hover:underline"
      title="Clique pra editar"
    >
      {formatBRL(valorAtual)}
    </button>
  );
}
