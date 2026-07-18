"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extrairPrecosCotacao, type ItemCotacaoExtraido } from "@/features/cotacoes/lib/extrair-precos-cotacao";
import {
  sugerirItemCotacaoPorDescricao,
  listarItensCotacaoParaImport,
  atualizarPrecoCotacaoItem,
  mudarStatusCotacao,
  type SugestaoItemCotacao,
} from "@/features/cotacoes/actions/cotacao-actions";

interface Props {
  cotacaoId: string;
}

interface LinhaRevisao extends ItemCotacaoExtraido {
  selecionado: boolean;
  cotacaoItemId: string | null;
}

/**
 * Import de PDF de resposta do fornecedor — extrai descrição+preço do
 * PDF que o fornecedor manda de volta, sugere qual item da cotação (já
 * existente, vindo do levantamento) cada linha corresponde, e deixa a
 * pessoa confirmar/corrigir antes de aplicar. Mesmo espírito da
 * Importação de Nota Fiscal: melhor esforço, nunca aplica sem revisão.
 */
export function ImportarRespostaCotacaoView({ cotacaoId }: Props) {
  const router = useRouter();
  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const [extraindo, setExtraindo] = React.useState(false);
  const [linhas, setLinhas] = React.useState<LinhaRevisao[]>([]);
  const [itensCotacao, setItensCotacao] = React.useState<SugestaoItemCotacao[]>([]);
  const [erro, setErro] = React.useState<string | null>(null);
  const [confirmando, setConfirmando] = React.useState(false);
  const [avisoNenhumItem, setAvisoNenhumItem] = React.useState(false);

  async function handleExtrair() {
    setErro(null);
    setAvisoNenhumItem(false);
    if (!arquivo) {
      setErro("Escolha o arquivo PDF da resposta do fornecedor.");
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

      const [resultado, todosItens] = await Promise.all([
        extrairPrecosCotacao(base64),
        listarItensCotacaoParaImport(cotacaoId),
      ]);
      setItensCotacao(todosItens);

      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      if (resultado.itens.length === 0) {
        setAvisoNenhumItem(true);
        setLinhas([]);
        return;
      }

      const linhasComSugestao = await Promise.all(
        resultado.itens.map(async (item) => {
          const sugestao = await sugerirItemCotacaoPorDescricao(cotacaoId, item.descricao);
          return {
            ...item,
            selecionado: !!sugestao,
            cotacaoItemId: sugestao?.cotacaoItemId ?? null,
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
    const selecionadas = linhas.filter((l) => l.selecionado && l.cotacaoItemId);
    if (selecionadas.length === 0) {
      setErro("Selecione ao menos um item pra aplicar.");
      return;
    }
    setConfirmando(true);
    try {
      for (const linha of selecionadas) {
        if (!linha.cotacaoItemId) continue;
        await atualizarPrecoCotacaoItem(linha.cotacaoItemId, linha.valorUnitario);
      }
      await mudarStatusCotacao(cotacaoId, "RESPONDIDA");
      router.refresh();
      router.push(`/cotacoes/${cotacaoId}`);
    } catch {
      setErro("Erro ao aplicar os preços. Tenta de novo.");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">1. Escolher o PDF de resposta do fornecedor</CardTitle>
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
            Extrair itens do PDF
          </Button>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {avisoNenhumItem && (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
              Não consegui identificar nenhuma linha de item nesse PDF. O layout desse fornecedor pode ser diferente
              do esperado — você ainda pode preencher os preços manualmente na tela da cotação.
            </p>
          )}
        </CardContent>
      </Card>

      {linhas.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">2. Revisar antes de aplicar ({linhas.length} linha(s) encontrada(s))</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0 p-0">
            <p className="px-4 pt-4 text-xs text-muted-foreground">
              Confere se o item sugerido bate com a descrição extraída do PDF — troca no dropdown se não bater.
              Só os marcados com ✓ são aplicados.
            </p>
            <div className="mt-3 divide-y divide-border/50">
              {linhas.map((linha, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={linha.selecionado}
                    onChange={(e) =>
                      setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, selecionado: e.target.checked } : l)))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-muted-foreground">PDF: {linha.descricao}</p>
                    <select
                      value={linha.cotacaoItemId ?? ""}
                      onChange={(e) =>
                        setLinhas((prev) =>
                          prev.map((l, idx) => (idx === i ? { ...l, cotacaoItemId: e.target.value || null } : l))
                        )
                      }
                      className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">— nenhum item correspondente —</option>
                      {itensCotacao.map((item) => (
                        <option key={item.cotacaoItemId} value={item.cotacaoItemId}>
                          {item.descricao}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={linha.valorUnitario}
                    onChange={(e) =>
                      setLinhas((prev) =>
                        prev.map((l, idx) => (idx === i ? { ...l, valorUnitario: Number(e.target.value) || 0 } : l))
                      )
                    }
                    className="h-8 w-24 shrink-0 rounded-md border border-input bg-background px-2 text-right text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4">
              <Button onClick={handleConfirmar} disabled={confirmando}>
                {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aplicar preços selecionados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
