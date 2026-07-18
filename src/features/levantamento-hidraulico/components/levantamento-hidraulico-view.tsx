"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Droplets, CheckCircle, RotateCcw, Trash2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SUBTIPOS_HIDRAULICO,
  agruparItens,
  type LevantamentoHidraulico,
  type SubtipoHidraulico,
} from "@/core/empreendimentos/entities/levantamento-hidraulico";
import { MaterialPexDialog } from "@/features/levantamento/components/material-pex-dialog";
import {
  abrirOuCriarLevantamentoHidraulico,
  adicionarItemHidraulico,
  excluirItemHidraulico,
  validarLevantamentoHidraulico,
  voltarParaRascunhoHidraulico,
} from "@/features/levantamento-hidraulico/actions/levantamento-hidraulico-actions";

interface Tipologia {
  id: string;
  nome: string;
  areaPrivativa?: number | null;
  quantidadeUnidades?: number;
}

interface Props {
  empreendimentoId: string;
  tipologias: Tipologia[];
  tipologiaAtivaId?: string;
  subtipoAtivo: SubtipoHidraulico;
  levantamento: LevantamentoHidraulico | null;
  podeValidar: boolean;
}

const UNIDADES = ["un", "m", "rolo"];

export function LevantamentoHidraulicoView({
  empreendimentoId,
  tipologias,
  tipologiaAtivaId,
  subtipoAtivo,
  levantamento,
  podeValidar,
}: Props) {
  const router = useRouter();
  const [criando, setCriando] = React.useState(false);
  const [validando, setValidando] = React.useState(false);
  const [revertendo, setRevertendo] = React.useState(false);
  const [dialogPexAberto, setDialogPexAberto] = React.useState(false);

  // Formulário de item manual (Esgoto / Água Quente / Água Fria)
  const [descManual, setDescManual] = React.useState("");
  const [qtdManual, setQtdManual] = React.useState("1");
  const [unidadeManual, setUnidadeManual] = React.useState("un");
  const [salvandoManual, setSalvandoManual] = React.useState(false);

  const tipologiaAtiva = tipologias.find((t) => t.id === tipologiaAtivaId);
  const itens = levantamento?.itens ?? [];
  const resumo = agruparItens(itens);
  const ehRascunho = levantamento?.status === "RASCUNHO";
  const ehValidado = levantamento?.status === "VALIDADO";

  function trocarQuery(params: Record<string, string>) {
    const usp = new URLSearchParams(window.location.search);
    Object.entries(params).forEach(([k, v]) => usp.set(k, v));
    router.push(`?${usp.toString()}`);
  }

  async function handleAbrir() {
    if (!tipologiaAtivaId) return;
    setCriando(true);
    const resultado = await abrirOuCriarLevantamentoHidraulico(empreendimentoId, tipologiaAtivaId, subtipoAtivo);
    setCriando(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleAdicionarPex(itensSelecionados: { material: { id: string; categoria: string; nome: string; diametro: string | null; unidade: string }; quantidade: number }[]) {
    if (!levantamento) return;
    for (const { material, quantidade } of itensSelecionados) {
      await adicionarItemHidraulico(empreendimentoId, levantamento.id, {
        materialPexId: material.id,
        descricao: material.nome,
        categoria: material.categoria,
        diametro: material.diametro,
        unidade: material.unidade,
        quantidade,
      });
    }
    router.refresh();
  }

  async function handleAdicionarManual() {
    if (!levantamento || !descManual.trim()) return;
    const qtd = parseFloat(qtdManual.replace(",", "."));
    if (isNaN(qtd) || qtd <= 0) { alert("Quantidade inválida."); return; }
    setSalvandoManual(true);
    const resultado = await adicionarItemHidraulico(empreendimentoId, levantamento.id, {
      descricao: descManual.trim(),
      unidade: unidadeManual,
      quantidade: qtd,
    });
    setSalvandoManual(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    setDescManual("");
    setQtdManual("1");
    router.refresh();
  }

  async function handleExcluirItem(id: string) {
    const resultado = await excluirItemHidraulico(empreendimentoId, id);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleValidar() {
    if (!levantamento) return;
    setValidando(true);
    const resultado = await validarLevantamentoHidraulico(
      empreendimentoId, levantamento.id, subtipoAtivo, tipologiaAtiva?.nome ?? ""
    );
    setValidando(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleReverter() {
    if (!levantamento) return;
    setRevertendo(true);
    const resultado = await voltarParaRascunhoHidraulico(empreendimentoId, levantamento.id);
    setRevertendo(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs de tipologia */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tipologias.map((t) => (
          <button
            key={t.id}
            onClick={() => trocarQuery({ tipologia: t.id })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              t.id === tipologiaAtivaId
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.nome}
            {t.areaPrivativa && <span className="ml-1.5 text-xs opacity-70">{t.areaPrivativa}m²</span>}
          </button>
        ))}
      </div>

      {/* Sub-tabs de subtipo hidráulico */}
      <div className="flex flex-wrap gap-2">
        {SUBTIPOS_HIDRAULICO.map((s) => (
          <button
            key={s.value}
            onClick={() => trocarQuery({ subtipo: s.value })}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              s.value === subtipoAtivo
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <Droplets className="h-3 w-3" />
            {s.label}
          </button>
        ))}
      </div>

      {!levantamento ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Droplets className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            Nenhum levantamento de {SUBTIPOS_HIDRAULICO.find((s) => s.value === subtipoAtivo)?.label} para {tipologiaAtiva?.nome}
          </p>
          <Button className="mt-4" onClick={handleAbrir} disabled={criando}>
            {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Iniciar levantamento
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-[15px]">
                  {SUBTIPOS_HIDRAULICO.find((s) => s.value === subtipoAtivo)?.label} — {tipologiaAtiva?.nome}
                </CardTitle>
                {tipologiaAtiva?.quantidadeUnidades && (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {tipologiaAtiva.quantidadeUnidades} {tipologiaAtiva.quantidadeUnidades === 1 ? "unidade" : "unidades"} nesta tipologia
                  </span>
                )}
                {ehRascunho && (
                  <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
                    Rascunho
                  </span>
                )}
                {ehValidado && (
                  <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                    Validado
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {subtipoAtivo === "PEX" && ehRascunho && (
                  <Button size="sm" variant="outline" onClick={() => setDialogPexAberto(true)}>
                    <Package className="h-4 w-4" />
                    Adicionar materiais
                  </Button>
                )}
                {ehRascunho && itens.length > 0 && (
                  podeValidar ? (
                    <Button size="sm" onClick={handleValidar} disabled={validando}>
                      {validando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Validar e Salvar
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">
                      Aguardando validação de um gestor
                    </span>
                  )
                )}
                {ehValidado && (
                  <Button size="sm" variant="outline" onClick={handleReverter} disabled={revertendo}>
                    {revertendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reverter para rascunho
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Entrada manual para subtipos sem catálogo */}
              {subtipoAtivo !== "PEX" && ehRascunho && (
                <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground">Descrição do item</label>
                    <input
                      value={descManual}
                      onChange={(e) => setDescManual(e.target.value)}
                      placeholder="Ex: Tubo PVC esgoto 100mm"
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-24">
                    <label className="text-xs font-medium text-muted-foreground">Qtd.</label>
                    <input
                      value={qtdManual}
                      onChange={(e) => setQtdManual(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-24">
                    <label className="text-xs font-medium text-muted-foreground">Unidade</label>
                    <select
                      value={unidadeManual}
                      onChange={(e) => setUnidadeManual(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <Button size="sm" onClick={handleAdicionarManual} disabled={salvandoManual || !descManual.trim()}>
                    {salvandoManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Adicionar
                  </Button>
                </div>
              )}

              {/* Tabela de itens */}
              {itens.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {subtipoAtivo === "PEX"
                    ? "Nenhum material adicionado. Clique em \"Adicionar materiais\" para buscar no catálogo."
                    : "Nenhum item adicionado ainda."}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Item</th>
                      <th className="pb-2 font-medium">Diâmetro</th>
                      <th className="pb-2 font-medium text-right">Qtd.</th>
                      <th className="pb-2 font-medium">Und.</th>
                      {ehRascunho && <th className="pb-2 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {itens.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-foreground">{item.descricao}</td>
                        <td className="py-2 font-mono text-xs text-muted-foreground">{item.diametro ?? "—"}</td>
                        <td className="py-2 text-right font-mono">{item.quantidade}</td>
                        <td className="py-2 text-muted-foreground">{item.unidade}</td>
                        {ehRascunho && (
                          <td className="py-2">
                            <button onClick={() => handleExcluirItem(item.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Tabela resumo — mesma linguagem visual do elétrico */}
          {resumo.length > 0 && (
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm">Resumo Consolidado</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-1 pr-4">Item</th>
                      <th className="pb-1 pr-4">Diâmetro</th>
                      <th className="pb-1 text-right">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {resumo.map((r) => (
                      <tr key={`${r.descricao}-${r.diametro}`}>
                        <td className="py-1 pr-4 font-medium text-foreground">{r.descricao}</td>
                        <td className="py-1 pr-4 font-mono text-muted-foreground">{r.diametro ?? "—"}</td>
                        <td className="py-1 text-right font-mono font-semibold">
                          {r.quantidadeTotal} {r.unidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <MaterialPexDialog
        aberto={dialogPexAberto}
        onFechar={() => setDialogPexAberto(false)}
        onConfirmar={handleAdicionarPex}
        titulo="Adicionar materiais PEX ao levantamento"
      />
    </div>
  );
}
