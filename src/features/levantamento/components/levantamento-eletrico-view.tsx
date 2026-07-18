"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Calculator, FileSpreadsheet, AlertTriangle, CheckCircle, RotateCcw, FileDown, Printer, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calcularTotais,
  calcularComprimentoReal,
  calcularComprimentoEletroduto,
  type LevantamentoEletrico,
  type CircuitoCatalogo,
  type TotalCabo,
  type TotalEletroduto,
} from "@/core/empreendimentos/entities/levantamento-eletrico";
import {
  importarPlanilha,
  validarLevantamento,
  voltarParaRascunho,
  excluirLevantamentoEletrico,
} from "@/features/levantamento/actions/levantamento-actions";

interface Tipologia {
  id: string;
  nome: string;
  areaPrivativa?: number | null;
  quantidadeUnidades?: number;
}

interface LevantamentoEletricoViewProps {
  empreendimentoId: string;
  tipologias: Tipologia[];
  tipologiaAtivaId?: string;
  levantamento: LevantamentoEletrico | null;
  catalogo: CircuitoCatalogo[];
}

// Renderiza os fios ativos de um circuito de forma compacta e colorida
function FiosDoCircuito({ circ }: { circ: LevantamentoEletrico["pecas"][0]["circuitos"][0] }) {
  const fios: { label: string; ativo: boolean; css: string }[] = [
    { label: "VM", ativo: circ.temVermelho, css: "text-red-500" },
    { label: "PT", ativo: circ.temPreto, css: "text-foreground" },
    { label: "AZ", ativo: circ.temAzul, css: "text-blue-500" },
    { label: "VD", ativo: circ.temVerde, css: "text-green-600" },
    { label: "AM", ativo: circ.temAmarelo, css: "text-yellow-600" },
    { label: "BC", ativo: circ.temBranco, css: "text-gray-400" },
  ];
  return (
    <span className="inline-flex gap-1">
      {fios.filter((f) => f.ativo).map((f) => (
        <span key={f.label} className={`text-[10px] font-bold ${f.css}`}>{f.label}</span>
      ))}
    </span>
  );
}

export function LevantamentoEletricoView({
  empreendimentoId,
  tipologias,
  tipologiaAtivaId,
  levantamento,
  catalogo,
}: LevantamentoEletricoViewProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [importando, setImportando] = React.useState(false);
  const [validando, setValidando] = React.useState(false);
  const [revertendo, setRevertendo] = React.useState(false);
  const [excluindo, setExcluindo] = React.useState(false);
  const [mensagem, setMensagem] = React.useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const tipologiaAtiva = tipologias.find((t) => t.id === tipologiaAtivaId);
  const pecas = levantamento?.pecas ?? [];
  // Prioridade 1: totais OFICIAIS lidos direto da tabela consolidada da
  // planilha importada (fórmulas do Excel) — mais confiável, elimina
  // risco de divergência de fórmula com o cálculo próprio.
  // Prioridade 2 (fallback): calcularTotais a partir das peças — usado
  // quando o levantamento foi feito manualmente, sem planilha importada
  // com essa tabela.
  const totais = levantamento?.totaisImportadosJson
    ? (JSON.parse(levantamento.totaisImportadosJson) as { cabos: TotalCabo[]; eletrodutos: TotalEletroduto[] })
    : calcularTotais(pecas);
  const quantidadeUnidades = tipologiaAtiva?.quantidadeUnidades ?? 1;
  const ehRascunho = levantamento?.status === "RASCUNHO";
  const ehValidado = levantamento?.status === "VALIDADO";

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !tipologiaAtivaId) return;

    setImportando(true);
    setMensagem(null);

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    const resultado = await importarPlanilha(empreendimentoId, tipologiaAtivaId, formData);
    setImportando(false);

    // Limpa o input para permitir reimportar o mesmo arquivo
    if (inputRef.current) inputRef.current.value = "";

    if ("erro" in resultado) {
      setMensagem({ tipo: "erro", texto: resultado.erro });
      return;
    }

    setMensagem({
      tipo: "ok",
      texto: `${resultado.totalPecas} peças importadas com sucesso.${
        resultado.avisos.length > 0 ? ` Avisos: ${resultado.avisos.join(" ")}` : ""
      }`,
    });
    router.refresh();
  }

  async function handleValidar() {
    if (!levantamento) return;
    setValidando(true);
    const resultado = await validarLevantamento(empreendimentoId, levantamento.id);
    setValidando(false);
    if ("erro" in resultado) {
      setMensagem({ tipo: "erro", texto: resultado.erro });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Levantamento validado com sucesso." });
    router.refresh();
  }

  async function handleReverter() {
    if (!levantamento) return;
    setRevertendo(true);
    const resultado = await voltarParaRascunho(empreendimentoId, levantamento.id);
    setRevertendo(false);
    if ("erro" in resultado) {
      setMensagem({ tipo: "erro", texto: resultado.erro });
      return;
    }
    setMensagem({ tipo: "ok", texto: "Levantamento revertido para rascunho." });
    router.refresh();
  }

  async function handleExcluir() {
    if (!levantamento) return;
    if (
      !confirm(
        "Isso apaga TODAS as peças e circuitos deste levantamento — não dá pra desfazer. Confirma?"
      )
    )
      return;
    setExcluindo(true);
    const resultado = await excluirLevantamentoEletrico(empreendimentoId, levantamento.id);
    setExcluindo(false);
    if ("erro" in resultado) {
      setMensagem({ tipo: "erro", texto: resultado.erro });
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs de tipologia + botão de import */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-2">
          {tipologias.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`?tipologia=${t.id}`)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                t.id === tipologiaAtivaId
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.nome}
              {t.areaPrivativa && (
                <span className="ml-1.5 text-xs opacity-70">{t.areaPrivativa}m²</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm,.xltx"
            onChange={handleArquivoSelecionado}
            className="hidden"
          />
          {/* Reimportar — disponível em ambos os estados */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={importando}
          >
            {importando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {pecas.length > 0 ? "Reimportar" : "Importar planilha"}
          </Button>

          {/* Imprimir — disponível sempre que há peças */}
          {pecas.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          )}

          {/* Validar — só aparece quando é rascunho com peças */}
          {ehRascunho && pecas.length > 0 && (
            <Button
              size="sm"
              onClick={handleValidar}
              disabled={validando}
            >
              {validando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Validar e Salvar
            </Button>
          )}

          {/* Proposta comercial — agora consolidada, vive na página de
              Orçamentação do empreendimento (soma todas as tipologias) */}
          {ehValidado && (
            <Link href={`/empreendimentos/${empreendimentoId}/orcamento`}>
              <Button size="sm" variant="outline">
                <FileDown className="h-4 w-4" />
                Ir para Orçamentação
              </Button>
            </Link>
          )}

          {/* Reverter — só aparece quando está validado */}
          {ehValidado && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReverter}
              disabled={revertendo}
            >
              {revertendo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reverter para rascunho
            </Button>
          )}

          {/* Excluir — disponível sempre que há um levantamento iniciado.
              Some com tudo (peças e circuitos), volta a tipologia pro
              estado "sem levantamento". */}
          {levantamento && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExcluir}
              disabled={excluindo}
              className="text-destructive hover:bg-destructive/10"
            >
              {excluindo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Excluir levantamento
            </Button>
          )}
        </div>
      </div>

      {/* Mensagem de resultado do import */}
      {mensagem && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            mensagem.tipo === "ok"
              ? "border-success/30 bg-success/5 text-success"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {mensagem.tipo === "erro" && <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {!levantamento || pecas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            Nenhum levantamento para {tipologiaAtiva?.nome}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Faça o levantamento na planilha modelo e importe aqui. O sistema
            interpreta as peças, circuitos e calcula os totais automaticamente.
          </p>
          <Button
            className="mt-4"
            onClick={() => inputRef.current?.click()}
            disabled={importando}
          >
            {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar planilha
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Documento read-only */}
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-[15px]">
                    Levantamento — {tipologiaAtiva?.nome}
                  </CardTitle>
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
                <span className="text-xs text-muted-foreground">
                  {pecas.length} peças · Revisão {levantamento.revisao}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Peça</th>
                    <th className="px-2 py-2 font-medium">Tipo</th>
                    <th className="px-2 py-2 font-medium">Trecho</th>
                    <th className="px-2 py-2 font-medium hidden sm:table-cell">Ambiente</th>
                    <th className="px-2 py-2 font-medium text-right">Eletro</th>
                    <th className="px-2 py-2 font-medium">Ø</th>
                    <th className="px-2 py-2 font-medium text-right">Real</th>
                    <th className="px-2 py-2 font-medium">Bitola</th>
                    <th className="px-2 py-2 font-medium">Circ.</th>
                    <th className="px-2 py-2 font-medium">Fios</th>
                    <th className="px-2 py-2 font-medium">Ret.</th>
                  </tr>
                </thead>
                <tbody>
                  {pecas.map((peca) => {
                    const compEletro = calcularComprimentoEletroduto(peca);
                    const compReal = calcularComprimentoReal(peca);
                    const nLinhas = Math.max(peca.circuitos.length, 1);
                    return peca.circuitos.length === 0 ? (
                      <tr key={peca.id} className="border-b border-border">
                        <td className="px-3 py-1.5 font-mono font-semibold">
                          {String(peca.numero).padStart(2, "0")}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{peca.kit}</td>
                        <td className="px-2 py-1.5 font-medium">{peca.trecho}</td>
                        <td className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell">{peca.local}</td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {compEletro.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 font-mono">{peca.diametro}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-semibold">{compReal.toFixed(2)}m</td>
                        <td colSpan={4} className="px-2 py-1.5 text-muted-foreground italic">sem circuitos</td>
                      </tr>
                    ) : (
                      peca.circuitos.map((circ, idx) => (
                        <tr
                          key={circ.id}
                          className={idx === nLinhas - 1 ? "border-b-2 border-border" : "border-b border-border/30"}
                        >
                          {idx === 0 && (
                            <>
                              <td rowSpan={nLinhas} className="px-3 py-1.5 font-mono font-semibold align-top">
                                {String(peca.numero).padStart(2, "0")}
                              </td>
                              <td rowSpan={nLinhas} className="px-2 py-1.5 text-muted-foreground align-top">
                                {peca.kit}
                              </td>
                              <td rowSpan={nLinhas} className="px-2 py-1.5 font-medium align-top">
                                {peca.trecho}
                              </td>
                              <td rowSpan={nLinhas} className="px-2 py-1.5 text-muted-foreground align-top hidden sm:table-cell">
                                {peca.local}
                              </td>
                              <td rowSpan={nLinhas} className="px-2 py-1.5 text-right font-mono align-top">
                                {compEletro.toFixed(2)}
                              </td>
                              <td rowSpan={nLinhas} className="px-2 py-1.5 font-mono align-top">
                                {peca.diametro}
                              </td>
                              <td rowSpan={nLinhas} className="px-2 py-1.5 text-right font-mono font-semibold align-top">
                                {compReal.toFixed(2)}m
                              </td>
                            </>
                          )}
                          <td className="px-2 py-1.5 font-mono">{circ.bitola}mm²</td>
                          <td className="px-2 py-1.5 text-center">{circ.circuito ?? "—"}</td>
                          <td className="px-2 py-1.5"><FiosDoCircuito circ={circ} /></td>
                          <td className="px-2 py-1.5 font-mono">{circ.identRetorno ?? ""}</td>
                        </tr>
                      ))
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Totais */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
            <Calculator className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              Valores <strong>consolidados</strong> para{" "}
              <strong className="text-primary">{quantidadeUnidades}</strong>{" "}
              {quantidadeUnidades === 1 ? "unidade" : "unidades"} da tipologia {tipologiaAtiva?.nome}.
              {levantamento?.totaisImportadosJson && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (lidos direto da tabela consolidada da planilha)
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Total de Cabos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {totais.cabos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum circuito.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-1 pr-4 font-medium">Bitola</th>
                        <th className="pb-1 pr-4 font-medium">Cor</th>
                        <th className="pb-1 pr-4 text-right font-medium">Por unidade</th>
                        <th className="pb-1 text-right font-medium">Consolidado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {totais.cabos.map((c) => (
                        <tr key={`${c.bitola}-${c.cor}`}>
                          <td className="py-1 pr-4 font-mono">{c.bitola}mm²</td>
                          <td className={`py-1 pr-4 capitalize font-medium ${
                            c.cor === "vermelho" ? "text-red-500" :
                            c.cor === "azul" ? "text-blue-500" :
                            c.cor === "verde" ? "text-green-600" :
                            c.cor === "amarelo" ? "text-yellow-600" :
                            c.cor === "branco" ? "text-gray-400" :
                            c.cor === "cinza" ? "text-gray-600" : "text-foreground"
                          }`}>{c.cor}</td>
                          <td className="py-1 pr-4 text-right font-mono text-muted-foreground">{c.metros.toFixed(2)}m</td>
                          <td className="py-1 text-right font-mono font-semibold text-primary">
                            {(c.metros * quantidadeUnidades).toFixed(2)}m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Total de Eletrodutos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {totais.eletrodutos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma peça.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-1 pr-4 font-medium">Diâmetro</th>
                        <th className="pb-1 pr-4 text-right font-medium">Por unidade</th>
                        <th className="pb-1 text-right font-medium">Consolidado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {totais.eletrodutos.map((e) => (
                        <tr key={e.diametro}>
                          <td className="py-1 pr-4 font-mono">{e.diametro}</td>
                          <td className="py-1 pr-4 text-right font-mono text-muted-foreground">{e.metros.toFixed(2)}m</td>
                          <td className="py-1 text-right font-mono font-semibold text-primary">
                            {(e.metros * quantidadeUnidades).toFixed(2)}m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {ehRascunho && (
            <p className="text-xs text-warning text-center font-medium">
              Este levantamento está em rascunho. Revise os dados e clique em "Validar e Salvar" para confirmar.
            </p>
          )}
          {ehValidado && (
            <p className="text-xs text-muted-foreground text-center">
              Levantamento validado e pronto para orçamentação. Para reimportar, clique em "Reverter para rascunho".
            </p>
          )}
        </div>
      )}
    </div>
  );
}
