"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tag, Loader2, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  compararOfertasTabelaPreco,
  confirmarAplicacaoTabelaPreco,
} from "@/features/orcamentacao/actions/aplicar-tabela-preco-actions";

interface Fornecedor {
  id: string;
  nome: string;
}

interface OfertaComparacao {
  fornecedorId: string;
  fornecedorNome: string;
  marca: string;
  valorUnitario: number;
  itemTabelaPrecoId: string;
}

interface ItemComparacao {
  itemOrcamentoId: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoAtual: number | null;
  ofertas: OfertaComparacao[];
}

interface Props {
  orcamentoId: string;
  empreendimentoId: string;
  fornecedoresDisponiveis: Fornecedor[];
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AplicarTabelaPrecoButton({ orcamentoId, empreendimentoId, fornecedoresDisponiveis }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [selecionados, setSelecionados] = React.useState<string[]>([]);
  const [comparando, setComparando] = React.useState(false);
  const [confirmando, setConfirmando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const [itens, setItens] = React.useState<ItemComparacao[] | null>(null);
  const [totalSemOferta, setTotalSemOferta] = React.useState(0);
  // itemOrcamentoId -> índice escolhido dentro de itens[].ofertas
  const [escolhas, setEscolhas] = React.useState<Record<string, number>>({});

  function toggleFornecedor(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function fecharTudo() {
    setAberto(false);
    setItens(null);
    setEscolhas({});
    setErro(null);
    setSelecionados([]);
  }

  async function handleComparar() {
    setComparando(true);
    setErro(null);
    const resultado = await compararOfertasTabelaPreco(orcamentoId, selecionados);
    setComparando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setItens(resultado.itens);
    setTotalSemOferta(resultado.totalSemOferta);
    // Default: primeira oferta (maior prioridade = ordem escolhida) por item.
    const defaults: Record<string, number> = {};
    for (const item of resultado.itens) defaults[item.itemOrcamentoId] = 0;
    setEscolhas(defaults);
  }

  async function handleConfirmar() {
    if (!itens) return;
    setConfirmando(true);
    const payload = itens
      .map((item) => {
        const oferta = item.ofertas[escolhas[item.itemOrcamentoId] ?? 0];
        if (!oferta) return null;
        return {
          itemOrcamentoId: item.itemOrcamentoId,
          fornecedorId: oferta.fornecedorId,
          itemTabelaPrecoId: oferta.itemTabelaPrecoId,
          valorUnitario: oferta.valorUnitario,
          marca: oferta.marca,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const resultado = await confirmarAplicacaoTabelaPreco(empreendimentoId, payload);
    setConfirmando(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    fecharTudo();
    router.refresh();
  }

  if (fornecedoresDisponiveis.length === 0) return null;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setAberto((v) => !v)}>
        <Tag className="h-4 w-4" />
        Aplicar Tabela de Preços
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {aberto && !itens && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-border bg-background p-4 shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Escolha os fornecedores pra comparar:
          </p>
          <div className="mb-3 flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {fornecedoresDisponiveis.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selecionados.includes(f.id)} onChange={() => toggleFornecedor(f.id)} />
                {f.nome}
              </label>
            ))}
          </div>
          {erro && <p className="mb-2 text-xs text-destructive">{erro}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleComparar} disabled={comparando || selecionados.length === 0}>
              {comparando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Comparar
            </Button>
            <Button size="sm" variant="ghost" onClick={fecharTudo}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      {itens && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={fecharTudo}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Comparar ofertas</h3>
                <p className="text-xs text-muted-foreground">
                  {itens.length} material(is) com oferta de algum fornecedor selecionado
                  {totalSemOferta > 0 && ` · ${totalSemOferta} sem oferta (mantêm o preço atual)`}
                </p>
              </div>
              <button onClick={fecharTudo} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {itens.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum material do orçamento bateu com os fornecedores selecionados.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {itens.map((item) => (
                  <div key={item.itemOrcamentoId} className="flex flex-col gap-2 p-3">
                    <span className="text-sm font-medium text-foreground">
                      {item.descricao} <span className="text-xs text-muted-foreground">({item.quantidade} {item.unidade})</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.ofertas.map((oferta, i) => {
                        const selecionado = (escolhas[item.itemOrcamentoId] ?? 0) === i;
                        return (
                          <button
                            key={oferta.fornecedorId}
                            onClick={() => setEscolhas((prev) => ({ ...prev, [item.itemOrcamentoId]: i }))}
                            className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                              selecionado
                                ? "border-primary bg-primary/10"
                                : "border-border bg-secondary/30 hover:bg-secondary/60"
                            }`}
                          >
                            <div className="font-medium text-foreground">{oferta.fornecedorNome}</div>
                            <div className="text-muted-foreground">{oferta.marca}</div>
                            <div className="font-semibold tabular-nums text-foreground">{formatBRL(oferta.valorUnitario)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {erro && <p className="mt-3 text-xs text-destructive">{erro}</p>}

            <div className="mt-4 flex items-center gap-2">
              <Button onClick={handleConfirmar} disabled={confirmando || itens.length === 0}>
                {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar aplicação ({itens.length} {itens.length === 1 ? "item" : "itens"})
              </Button>
              <Button variant="ghost" onClick={fecharTudo}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
