"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Package, CheckCircle, RotateCcw, Trash2, Upload, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  type LevantamentoMateriais,
  type ItemConsolidado,
} from "@/core/orcamentacao/entities/material-catalogo";
import { MaterialCatalogoDialog } from "@/features/orcamentacao/components/material-catalogo-dialog";
import {
  adicionarItemMaterial,
  excluirItemMaterial,
  excluirLevantamentoMateriaisCompleto,
  limparTodosItensMaterial,
  uploadMateriaisTipologia,
  validarLevantamentoMateriais,
  voltarParaRascunhoMateriais,
} from "@/features/orcamentacao/actions/levantamento-materiais-actions";
import { CONSOLIDADO_TAB_ID } from "@/features/orcamentacao/lib/consolidado-tab";

interface Tipologia {
  id: string;
  nome: string;
  quantidadeUnidades?: number;
}

interface Props {
  empreendimentoId: string;
  tipologias: Tipologia[];
  tipologiaAtivaId?: string;
  consolidadoAtivo: boolean;
  levantamento: LevantamentoMateriais | null;
  itensConsolidados?: ItemConsolidado[];
  podeValidar: boolean;
}

function formatNum(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function LevantamentoMateriaisView({
  empreendimentoId,
  tipologias,
  tipologiaAtivaId,
  consolidadoAtivo,
  levantamento,
  itensConsolidados,
  podeValidar,
}: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [validando, setValidando] = React.useState(false);
  const [revertendo, setRevertendo] = React.useState(false);
  const [limpando, setLimpando] = React.useState(false);
  const [excluindoTudo, setExcluindoTudo] = React.useState(false);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [mensagem, setMensagem] = React.useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const tipologiaAtiva = tipologias.find((t) => t.id === tipologiaAtivaId);
  const itens = levantamento?.itens ?? [];
  const ehRascunho = levantamento?.status === "RASCUNHO";
  const ehValidado = levantamento?.status === "VALIDADO";

  function trocarTipologia(id: string) {
    router.push(`?tipologia=${id}`);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !tipologiaAtivaId) return;

    setEnviando(true);
    setMensagem(null);
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    const resultado = await uploadMateriaisTipologia(empreendimentoId, tipologiaAtivaId, formData);
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";

    if ("erro" in resultado) {
      setMensagem({ tipo: "erro", texto: resultado.erro });
      return;
    }
    const partes = [`${resultado.totalItens} material(is) importado(s)`, `${resultado.vinculados} vinculado(s) ao catálogo`];
    setMensagem({
      tipo: resultado.codigosNaoEncontrados.length > 0 ? "erro" : "ok",
      texto: `${partes.join(", ")}.${resultado.avisos.length > 0 ? ` ${resultado.avisos.join(" ")}` : ""}`,
    });
    router.refresh();
  }

  async function handleAdicionar(itensSelecionados: { material: { id: string; fabricante: string; descricao: string; unidade: string; precoUnitario: number; avulso?: boolean }; quantidade: number }[]) {
    if (!levantamento) return;
    for (const { material, quantidade } of itensSelecionados) {
      await adicionarItemMaterial(empreendimentoId, levantamento.id, {
        materialCatalogoId: material.avulso ? null : material.id,
        fabricante: material.fabricante,
        descricao: material.descricao,
        unidade: material.unidade,
        precoUnitario: material.precoUnitario,
        quantidade,
      });
    }
    router.refresh();
  }

  async function handleExcluir(itemId: string) {
    const resultado = await excluirItemMaterial(empreendimentoId, itemId);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleLimparTudo() {
    if (!levantamento) return;
    if (!confirm(`Isso apaga TODOS os ${itens.length} item(ns) deste levantamento de materiais — não dá pra desfazer. Confirma?`)) return;
    setLimpando(true);
    const resultado = await limparTodosItensMaterial(empreendimentoId, levantamento.id);
    setLimpando(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleExcluirLevantamentoCompleto() {
    if (!levantamento) return;
    if (!confirm("Isso exclui o Levantamento de Materiais inteiro desta tipologia — volta como se nunca tivesse sido iniciado. Não dá pra desfazer. Confirma?")) return;
    setExcluindoTudo(true);
    const resultado = await excluirLevantamentoMateriaisCompleto(empreendimentoId, levantamento.id);
    setExcluindoTudo(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleValidar() {
    if (!levantamento) return;
    setValidando(true);
    const resultado = await validarLevantamentoMateriais(empreendimentoId, levantamento.id, tipologiaAtiva?.nome ?? "");
    setValidando(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleReverter() {
    if (!levantamento) return;
    setRevertendo(true);
    const resultado = await voltarParaRascunhoMateriais(empreendimentoId, levantamento.id);
    setRevertendo(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tipologias.map((t) => (
          <button
            key={t.id}
            onClick={() => trocarTipologia(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              !consolidadoAtivo && t.id === tipologiaAtivaId ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.nome}
          </button>
        ))}
        <button
          onClick={() => trocarTipologia(CONSOLIDADO_TAB_ID)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            consolidadoAtivo ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Consolidado
        </button>
      </div>

      {consolidadoAtivo ? (
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-[15px]">Consolidado — todas as tipologias</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!itensConsolidados || itensConsolidados.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum material lançado em nenhuma tipologia ainda.
              </p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Descrição</th>
                      <th className="px-2 py-2 text-left font-medium w-32">Categoria</th>
                      <th className="px-2 py-2 text-left font-medium w-20">Unidade</th>
                      <th className="px-2 py-2 text-right font-medium w-28">Quantidade Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {itensConsolidados.map((item) => (
                      <tr key={item.chave}>
                        <td className="px-3 py-2 text-foreground">
                          {item.descricao}
                          {!item.vinculadoAoCatalogo && (
                            <span className="ml-1.5 text-xs text-warning" title="Sem vínculo com o catálogo — soma por descrição">
                              *
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">{item.categoria ?? "—"}</td>
                        <td className="px-2 py-2 text-muted-foreground">{item.unidade}</td>
                        <td className="px-2 py-2 text-right font-medium text-foreground tabular-nums">{formatNum(item.quantidadeTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !levantamento || itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum material importado para {tipologiaAtiva?.nome}</p>
          <p className="mt-1 text-xs text-muted-foreground">Suba a planilha de levantamento elétrico desta tipologia (aba MATERIAL).</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xltx" onChange={handleUpload} className="hidden" />
          <Button className="mt-4" onClick={() => inputRef.current?.click()} disabled={enviando}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Fazer upload da planilha
          </Button>
          {mensagem && (
            <p className={`mt-3 text-xs ${mensagem.tipo === "erro" ? "text-destructive" : "text-success"}`}>{mensagem.texto}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {mensagem && (
            <p className={`text-xs ${mensagem.tipo === "erro" ? "text-destructive" : "text-success"}`}>{mensagem.texto}</p>
          )}
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-[15px]">Materiais — {tipologiaAtiva?.nome}</CardTitle>
                {ehRascunho && <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">Rascunho</span>}
                {ehValidado && <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">Validado</span>}
              </div>
              <div className="flex items-center gap-2">
                {ehRascunho && (
                  <>
                    <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xltx" onChange={handleUpload} className="hidden" />
                    <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={enviando}>
                      {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Reenviar planilha
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
                      <Plus className="h-4 w-4" />
                      Adicionar materiais
                    </Button>
                  </>
                )}
                {levantamento && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" disabled={limpando || excluindoTudo} className="text-destructive hover:bg-destructive/10">
                        {limpando || excluindoTudo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Limpar / Excluir
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {itens.length > 0 && (
                        <DropdownMenuItem onClick={handleLimparTudo}>Limpar todos os itens (mantém o levantamento)</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleExcluirLevantamentoCompleto} className="text-destructive">
                        Excluir levantamento inteiro
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Descrição</th>
                      <th className="px-2 py-2 text-left font-medium w-28">Categoria</th>
                      <th className="px-2 py-2 text-left font-medium w-24">Un. Consumo</th>
                      <th className="px-2 py-2 text-right font-medium w-28">Qtd. Unitária</th>
                      <th className="px-2 py-2 text-right font-medium w-20">Repetições</th>
                      <th className="px-2 py-2 text-right font-medium w-24">Qtd. Total</th>
                      {ehRascunho && <th className="w-8"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {itens.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-foreground">{item.descricao}</td>
                        <td className="px-2 py-2 text-muted-foreground">{item.categoria ?? "—"}</td>
                        <td className="px-2 py-2 text-muted-foreground">{item.unidade}</td>
                        <td className="px-2 py-2 text-right text-muted-foreground tabular-nums">
                          {item.quantidadeUnitaria != null ? formatNum(item.quantidadeUnitaria) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground tabular-nums">{item.repeticoes ?? "—"}</td>
                        <td className="px-2 py-2 text-right font-medium text-foreground tabular-nums">{formatNum(item.quantidade)}</td>
                        {ehRascunho && (
                          <td className="px-2 py-2 w-8">
                            <button onClick={() => handleExcluir(item.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <MaterialCatalogoDialog aberto={dialogAberto} onFechar={() => setDialogAberto(false)} onConfirmar={handleAdicionar} />
    </div>
  );
}
