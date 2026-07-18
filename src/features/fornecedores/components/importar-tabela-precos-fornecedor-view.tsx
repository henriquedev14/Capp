"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Check, Search, X, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extrairPrecosCotacao, type ItemCotacaoExtraido } from "@/features/cotacoes/lib/extrair-precos-cotacao";
import {
  aplicarItemTabelaPrecoFornecedor,
  sugerirMaterialPorCodigoFornecedor,
  sugerirMaterialPorDescricao,
} from "@/features/fornecedores/actions/produto-fornecedor-actions";

interface Props {
  fornecedorId: string;
}

interface MaterialCatalogoResultado {
  id: string;
  fabricante: string;
  categoria: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  kit: string;
}

interface LinhaEstado extends ItemCotacaoExtraido {
  selecionado: boolean;
  materialEletricoId: string | null;
  /** Nome do material já confirmado (ou sugerido por código) — só pra exibição. */
  materialDescricao: string | null;
  /** De onde veio o match — pra diferenciar confiança na UI. */
  origemMatch: "codigo" | "descricao" | "manual" | null;
}

/** PDF não tem texto extraível pra descrição desse item (ver diagnóstico em extrair-precos-cotacao.ts). */
function ehDescricaoPlaceholder(descricao: string): boolean {
  return /descrição não disponível no PDF do fornecedor/.test(descricao);
}

/**
 * Import de PDF de TABELA DE PREÇOS GERAL do fornecedor — diferente de
 * responder uma Cotação específica de um Orçamento (ver
 * `importar-cotacao-fornecedor-view.tsx`). Aqui não existe uma cotação
 * pendente à qual anexar os preços: cada linha da tabela vira (ou
 * atualiza) uma entrada no catálogo desse fornecedor (`ProdutoFornecedor`),
 * casada com o catálogo global de materiais.
 */
export function ImportarTabelaPrecosFornecedorView({ fornecedorId }: Props) {
  const router = useRouter();
  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const [extraindo, setExtraindo] = React.useState(false);
  const [linhas, setLinhas] = React.useState<LinhaEstado[]>([]);
  const [erro, setErro] = React.useState<string | null>(null);
  const [confirmando, setConfirmando] = React.useState(false);
  const [avisoNenhumItem, setAvisoNenhumItem] = React.useState(false);
  const [progresso, setProgresso] = React.useState<string | null>(null);

  function atualizarLinha(i: number, patch: Partial<LinhaEstado>) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function handleExtrair() {
    setErro(null);
    setAvisoNenhumItem(false);
    setLinhas([]);
    if (!arquivo) {
      setErro("Escolha o arquivo PDF da tabela de preços.");
      return;
    }
    setExtraindo(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
        reader.readAsDataURL(arquivo);
      });

      const resultado = await extrairPrecosCotacao(base64);
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      if (resultado.itens.length === 0) {
        setAvisoNenhumItem(true);
        return;
      }

      const linhasComSugestao = await Promise.all(
        resultado.itens.map(async (item) => {
          let sugestao = item.codigo
            ? await sugerirMaterialPorCodigoFornecedor(fornecedorId, item.codigo)
            : null;
          let origemMatch: "codigo" | "descricao" | null = sugestao ? "codigo" : null;

          // Fallback: match por descrição só faz sentido se o PDF de fato
          // tinha texto extraível ali (não o placeholder "[CODIGO] —
          // descrição não disponível...").
          if (!sugestao && !ehDescricaoPlaceholder(item.descricao)) {
            sugestao = await sugerirMaterialPorDescricao(item.descricao);
            if (sugestao) origemMatch = "descricao";
          }

          return {
            ...item,
            selecionado: !!sugestao,
            materialEletricoId: sugestao?.materialEletricoId ?? null,
            materialDescricao: sugestao?.descricao ?? null,
            origemMatch,
          };
        })
      );
      setLinhas(linhasComSugestao);
    } catch {
      setErro("Erro inesperado ao ler o arquivo.");
    } finally {
      setExtraindo(false);
    }
  }

  async function handleConfirmar() {
    setErro(null);
    const selecionadas = linhas.filter((l) => l.selecionado && l.materialEletricoId);
    if (selecionadas.length === 0) {
      setErro("Selecione ao menos um item com material identificado pra aplicar.");
      return;
    }
    setConfirmando(true);
    try {
      for (let idx = 0; idx < selecionadas.length; idx++) {
        const linha = selecionadas[idx]!;
        setProgresso(`Aplicando ${idx + 1} de ${selecionadas.length}...`);
        if (!linha.materialEletricoId) continue;
        await aplicarItemTabelaPrecoFornecedor(fornecedorId, linha.materialEletricoId, {
          codigo: linha.codigo,
          precoUnitario: linha.valorUnitario,
        });
      }
      router.push(`/fornecedores/${fornecedorId}`);
      router.refresh();
    } catch {
      setErro("Erro ao aplicar os preços. Tenta de novo.");
    } finally {
      setConfirmando(false);
      setProgresso(null);
    }
  }

  const quantidadeComMaterial = linhas.filter((l) => l.materialEletricoId).length;
  const quantidadeSemMaterial = linhas.length - quantidadeComMaterial;
  const quantidadePorConfirmar = linhas.filter((l) => l.origemMatch === "descricao").length;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">1. Escolher o PDF da tabela de preços</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-5">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <Button onClick={handleExtrair} disabled={extraindo || !arquivo} className="w-fit">
            {extraindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Extrair itens da tabela
          </Button>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {avisoNenhumItem && (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
              Não consegui identificar nenhuma linha de item nesse PDF. O layout desse fornecedor pode ser diferente
              do esperado.
            </p>
          )}
        </CardContent>
      </Card>

      {linhas.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">
              2. Revisar antes de aplicar ({linhas.length} linha(s) — {quantidadeComMaterial} identificada(s), {quantidadeSemMaterial} sem material vinculado)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0 p-0">
            <p className="px-4 pt-4 text-xs text-muted-foreground">
              Verde = código já aprendido (alta confiança). Âmbar = sugestão por descrição — confira antes de
              aplicar{quantidadePorConfirmar > 0 ? ` (${quantidadePorConfirmar} nessa situação)` : ""}. Os demais
              precisam de busca manual (nem todo PDF de fornecedor tem a descrição como texto — só o código).
              Você não precisa resolver todos agora: pode aplicar só os já identificados e voltar depois pro resto.
            </p>
            <div className="mt-3 divide-y divide-border/50">
              {linhas.map((linha, i) => (
                <LinhaTabelaPreco
                  key={i}
                  linha={linha}
                  onToggleSelecionado={(v) => atualizarLinha(i, { selecionado: v })}
                  onValorChange={(v) => atualizarLinha(i, { valorUnitario: v })}
                  onEscolherMaterial={(materialId, descricao) =>
                    atualizarLinha(i, {
                      materialEletricoId: materialId,
                      materialDescricao: descricao,
                      selecionado: true,
                      origemMatch: "manual",
                    })
                  }
                  onLimparMaterial={() =>
                    atualizarLinha(i, {
                      materialEletricoId: null,
                      materialDescricao: null,
                      selecionado: false,
                      origemMatch: null,
                    })
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-3 border-t border-border p-4">
              <Button onClick={handleConfirmar} disabled={confirmando}>
                {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aplicar preços selecionados
              </Button>
              {progresso && <span className="text-xs text-muted-foreground">{progresso}</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Linha individual — encapsula sua própria busca no catálogo (debounce e
// resultados isolados por linha, já que cada uma pode buscar algo diferente).
// ---------------------------------------------------------------------------

function LinhaTabelaPreco({
  linha,
  onToggleSelecionado,
  onValorChange,
  onEscolherMaterial,
  onLimparMaterial,
}: {
  linha: LinhaEstado;
  onToggleSelecionado: (v: boolean) => void;
  onValorChange: (v: number) => void;
  onEscolherMaterial: (materialId: string, descricao: string) => void;
  onLimparMaterial: () => void;
}) {
  const [busca, setBusca] = React.useState("");
  const [resultados, setResultados] = React.useState<MaterialCatalogoResultado[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const [buscaAberta, setBuscaAberta] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (busca.length < 2) {
      setResultados([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/materiais-catalogo?q=${encodeURIComponent(busca)}`);
        const data: MaterialCatalogoResultado[] = await res.json();
        setResultados(data);
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busca]);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <input
        type="checkbox"
        checked={linha.selecionado}
        disabled={!linha.materialEletricoId}
        onChange={(e) => onToggleSelecionado(e.target.checked)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted-foreground">
          {linha.codigo && (
            <span className="mr-1.5 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground">
              {linha.codigo}
            </span>
          )}
          PDF: {linha.descricao}
        </p>

        {linha.materialEletricoId && !buscaAberta ? (
          <div className="mt-1 flex items-center gap-2">
            <span
              className={
                linha.origemMatch === "descricao"
                  ? "flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-xs text-warning"
                  : "flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs text-success"
              }
            >
              <Check className="h-3 w-3" />
              {linha.materialDescricao}
              {linha.origemMatch === "descricao" && " (sugestão — confira)"}
            </span>
            <button
              type="button"
              onClick={() => setBuscaAberta(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <PencilLine className="h-3 w-3" />
              Trocar
            </button>
          </div>
        ) : (
          <div className="relative mt-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar material no catálogo..."
                className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-7 text-sm"
              />
              {buscaAberta && linha.materialEletricoId && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaAberta(false);
                    setBusca("");
                    setResultados([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {busca.length >= 2 && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-card-md">
                {buscando ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Buscando...</div>
                ) : resultados.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum material encontrado.</div>
                ) : (
                  resultados.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onEscolherMaterial(r.id, `${r.fabricante} — ${r.descricao}`);
                        setBuscaAberta(false);
                        setBusca("");
                        setResultados([]);
                      }}
                      className="flex w-full flex-col items-start gap-0.5 border-b border-border/50 px-3 py-2 text-left text-xs last:border-0 hover:bg-secondary/50"
                    >
                      <span className="font-medium text-foreground">{r.descricao}</span>
                      <span className="text-muted-foreground">
                        {r.fabricante} · {r.categoria} · {r.unidade}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={linha.valorUnitario}
        onChange={(e) => onValorChange(Number(e.target.value) || 0)}
        className="h-8 w-24 shrink-0 rounded-md border border-input bg-background px-2 text-right text-sm"
      />
    </div>
  );
}
