"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extrairItensDaNota, type ItemNotaExtraido } from "@/features/suprimentos/lib/extrair-itens-nota";
import {
  sugerirMaterialPorDescricao,
  confirmarEntradasDaNota,
} from "@/features/suprimentos/actions/suprimentos-actions";

interface Props {
  empreendimentos: { id: string; nome: string; codigo: string }[];
  materiais: { id: string; nome: string; unidade: string }[];
}

interface LinhaRevisao extends ItemNotaExtraido {
  selecionado: boolean;
  materialEletricoId: string | null;
}

export function ImportarNotaFiscalView({ empreendimentos, materiais }: Props) {
  const router = useRouter();
  const [empreendimentoId, setEmpreendimentoId] = React.useState("");
  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const [extraindo, setExtraindo] = React.useState(false);
  const [linhas, setLinhas] = React.useState<LinhaRevisao[]>([]);
  const [erro, setErro] = React.useState<string | null>(null);
  const [confirmando, setConfirmando] = React.useState(false);
  const [avisoNenhumItem, setAvisoNenhumItem] = React.useState(false);

  async function handleExtrair() {
    setErro(null);
    setAvisoNenhumItem(false);
    if (!arquivo) {
      setErro("Escolha o arquivo PDF da nota.");
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

      const resultado = await extrairItensDaNota(base64);
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      if (resultado.itens.length === 0) {
        setAvisoNenhumItem(true);
        setLinhas([]);
        return;
      }

      // Pra cada item extraído, já tenta sugerir o material do catálogo
      // correspondente — a pessoa confirma ou troca antes de aplicar.
      const comSugestao = await Promise.all(
        resultado.itens.map(async (item) => {
          const sugestao = await sugerirMaterialPorDescricao(item.descricao);
          return {
            ...item,
            selecionado: !!sugestao,
            materialEletricoId: sugestao?.id ?? null,
          };
        })
      );
      setLinhas(comSugestao);
    } finally {
      setExtraindo(false);
    }
  }

  async function handleConfirmar() {
    setErro(null);
    const selecionadas = linhas.filter((l) => l.selecionado);
    if (selecionadas.length === 0) {
      setErro("Marque pelo menos um item.");
      return;
    }
    const semMaterial = selecionadas.find((l) => !l.materialEletricoId);
    if (semMaterial) {
      setErro(`Escolha o material do catálogo pra "${semMaterial.descricao}" antes de confirmar.`);
      return;
    }

    setConfirmando(true);
    try {
      const r = await confirmarEntradasDaNota(
        empreendimentoId,
        selecionadas.map((l) => ({ materialEletricoId: l.materialEletricoId!, quantidade: l.quantidade }))
      );
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setLinhas([]);
      setArquivo(null);
      router.push("/suprimentos");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">1. Escolha a obra e o PDF da nota</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Obra de destino:</label>
            <select
              value={empreendimentoId}
              onChange={(e) => setEmpreendimentoId(e.target.value)}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione a obra</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} — {e.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="flex-1 text-sm"
            />
            <Button onClick={handleExtrair} disabled={extraindo || !arquivo}>
              {extraindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Ler nota
            </Button>
          </div>

          {erro && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>
          )}
          {avisoNenhumItem && (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
              Não consegui identificar nenhum item nessa nota — o layout desse fornecedor pode ser diferente do
              esperado. Pode ser mais rápido lançar essa entrada manualmente na tela de Suprimentos.
            </p>
          )}
        </CardContent>
      </Card>

      {linhas.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">2. Confira os itens identificados</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Confirma o material de cada linha antes de aplicar — a leitura automática pode errar, principalmente em
              notas com layout diferente do usual.
            </p>
            <div className="flex flex-col divide-y divide-border/50">
              {linhas.map((linha, idx) => (
                <div key={idx} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
                  <input
                    type="checkbox"
                    checked={linha.selecionado}
                    onChange={(e) =>
                      setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, selecionado: e.target.checked } : l)))
                    }
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="w-full text-sm text-foreground sm:w-64 sm:shrink-0">{linha.descricao}</span>
                  <select
                    value={linha.materialEletricoId ?? ""}
                    onChange={(e) =>
                      setLinhas((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, materialEletricoId: e.target.value || null } : l))
                      )
                    }
                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Escolha o material do catálogo</option>
                    {materiais.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={linha.quantidade}
                    onChange={(e) =>
                      setLinhas((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, quantidade: Number(e.target.value.replace(",", ".")) || 0 } : l
                        )
                      )
                    }
                    className="h-9 w-24 shrink-0 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums"
                  />
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">{linha.unidade}</span>
                </div>
              ))}
            </div>

            <Button className="mt-4" onClick={handleConfirmar} disabled={confirmando || !empreendimentoId}>
              {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmar entradas selecionadas
            </Button>
            {!empreendimentoId && (
              <p className="mt-2 text-xs text-warning">Escolha a obra de destino lá em cima antes de confirmar.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
