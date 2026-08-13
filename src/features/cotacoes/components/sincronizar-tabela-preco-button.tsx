"use client";

import * as React from "react";
import { Loader2, RefreshCw, AlertTriangle, X } from "lucide-react";
import {
  previewSincronizarTabelaPreco,
  sincronizarTabelaPrecoFornecedor,
} from "@/features/cotacoes/actions/sincronizar-tabela-preco-actions";

/**
 * Botão "Atualizar tabela de preços do fornecedor" — sincroniza os
 * preços dessa cotação com o catálogo geral do fornecedor. Pedido
 * pelo Henrique em 12/08/2026: precisa ficar dentro do fluxo de
 * cotação (sem passo duplicado em outro lugar), mas com aviso e
 * confirmação explícita antes de aplicar.
 */
export function SincronizarTabelaPrecoButton({ cotacaoId }: { cotacaoId: string }) {
  const [aberto, setAberto] = React.useState(false);
  const [carregando, setCarregando] = React.useState(false);
  const [aplicando, setAplicando] = React.useState(false);
  const [preview, setPreview] = React.useState<{
    fornecedorNome: string;
    totalItensComPreco: number;
    totalItensSemMaterialVinculado: number;
    tabelaDestino: string;
  } | null>(null);
  const [resultado, setResultado] = React.useState<string | null>(null);

  async function handleAbrir() {
    setAberto(true);
    setResultado(null);
    setCarregando(true);
    const r = await previewSincronizarTabelaPreco(cotacaoId);
    setCarregando(false);
    if ("erro" in r) {
      setResultado(r.erro);
      return;
    }
    setPreview(r.preview);
  }

  async function handleConfirmar() {
    setAplicando(true);
    try {
      const r = await sincronizarTabelaPrecoFornecedor(cotacaoId);
      if ("erro" in r) {
        setResultado(r.erro);
        return;
      }
      setResultado(`${r.itensAtualizados} item(ns) atualizado(s) no catálogo do fornecedor.`);
      setPreview(null);
    } finally {
      setAplicando(false);
    }
  }

  return (
    <>
      <button
        onClick={handleAbrir}
        className="flex items-center gap-1.5 rounded-lg border border-input bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
      >
        <RefreshCw className="h-4 w-4" />
        Atualizar tabela do fornecedor
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Atualizar catálogo do fornecedor</h3>
              <button onClick={() => setAberto(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {carregando && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando...
              </div>
            )}

            {!carregando && preview && (
              <>
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-xs leading-relaxed text-warning">
                    Isso vai alterar o catálogo geral de <b>{preview.fornecedorNome}</b> — os preços passam a valer
                    pra qualquer obra futura, não só essa. Confirma?
                  </p>
                </div>
                <div className="mb-4 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Tabela de destino:</span> {preview.tabelaDestino}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Itens que serão atualizados:</span>{" "}
                    {preview.totalItensComPreco}
                  </p>
                  {preview.totalItensSemMaterialVinculado > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {preview.totalItensSemMaterialVinculado} item(ns) sem material vinculado — ficam de fora.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setAberto(false)}
                    className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmar}
                    disabled={aplicando}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {aplicando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirmar atualização
                  </button>
                </div>
              </>
            )}

            {resultado && (
              <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm text-foreground">{resultado}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
