"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2, AlertTriangle, X, History, Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validarPlanilhaTabelaPreco,
  importarTabelaPreco,
  buscarTabelaPrecoComItens,
  excluirTabelaPreco,
  atualizarStatusTabelaPreco,
} from "@/features/fornecedores/actions/tabela-preco-actions";

interface LinhaValidada {
  codigoInterno: string;
  descricao: string;
  unidade: string;
  valorUnitario: number;
  marca: string;
  prazoEntrega: string;
  observacoes: string;
  materialEletricoId: string | null;
  materialEletricoNome: string | null;
}

interface TabelaResumo {
  id: string;
  nome: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  dataImportacao: string;
  usuarioImportacaoNome: string;
  status: string;
  observacoes: string | null;
  totalItens: number;
}

interface TabelaComItens extends TabelaResumo {
  itens: {
    id: string;
    descricao: string;
    unidade: string;
    valorUnitario: number;
    marca: string;
    prazoEntrega: string | null;
    observacoes: string | null;
  }[];
}

interface Props {
  fornecedorId: string;
  tabelasIniciais: TabelaResumo[];
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<string, string> = { ATIVA: "Ativa", EXPIRADA: "Expirada", FUTURA: "Futura" };
const STATUS_COR: Record<string, string> = {
  ATIVA: "bg-success/15 text-success",
  EXPIRADA: "bg-muted text-muted-foreground",
  FUTURA: "bg-warning/15 text-warning",
};

export function TabelaDePrecoView({ fornecedorId, tabelasIniciais }: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [formAberto, setFormAberto] = React.useState(false);
  const [validando, setValidando] = React.useState(false);
  const [importando, setImportando] = React.useState(false);
  const [linhas, setLinhas] = React.useState<LinhaValidada[] | null>(null);
  const [avisos, setAvisos] = React.useState<string[]>([]);
  const [erro, setErro] = React.useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = React.useState("");

  const [nome, setNome] = React.useState("");
  const [vigenciaInicio, setVigenciaInicio] = React.useState("");
  const [vigenciaFim, setVigenciaFim] = React.useState("");
  const [status, setStatus] = React.useState<"ATIVA" | "EXPIRADA" | "FUTURA">("ATIVA");
  const [observacoes, setObservacoes] = React.useState("");

  const [tabelaAberta, setTabelaAberta] = React.useState<TabelaComItens | null>(null);
  const [carregandoTabela, setCarregandoTabela] = React.useState<string | null>(null);

  const totalInconsistencias = linhas?.filter((l) => !l.materialEletricoId).length ?? 0;

  function limparFormulario() {
    setFormAberto(false);
    setLinhas(null);
    setAvisos([]);
    setErro(null);
    setNomeArquivo("");
    setNome("");
    setVigenciaInicio("");
    setVigenciaFim("");
    setStatus("ATIVA");
    setObservacoes("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);
    setValidando(true);
    setErro(null);
    setLinhas(null);

    const formData = new FormData();
    formData.append("arquivo", arquivo);
    const resultado = await validarPlanilhaTabelaPreco(formData);
    setValidando(false);

    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setLinhas(resultado.linhas);
    setAvisos(resultado.avisos);
  }

  async function handleImportar() {
    if (!linhas) return;
    setImportando(true);
    setErro(null);
    const resultado = await importarTabelaPreco({
      fornecedorId,
      nome,
      vigenciaInicio,
      vigenciaFim,
      status,
      observacoes: observacoes || undefined,
      linhas,
    });
    setImportando(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    limparFormulario();
    router.refresh();
  }

  async function handleVerTabela(tabelaId: string) {
    setCarregandoTabela(tabelaId);
    const tabela = await buscarTabelaPrecoComItens(tabelaId);
    setCarregandoTabela(null);
    if (tabela) setTabelaAberta(tabela);
  }

  async function handleExcluir(tabelaId: string, nomeTabela: string) {
    if (!confirm(`Excluir a tabela "${nomeTabela}" — isso não pode ser desfeito. Confirma?`)) return;
    const resultado = await excluirTabelaPreco(tabelaId, fornecedorId);
    if (resultado.erro) {
      alert(resultado.erro);
      return;
    }
    router.refresh();
  }

  async function handleMudarStatus(tabelaId: string, novoStatus: "ATIVA" | "EXPIRADA" | "FUTURA") {
    await atualizarStatusTabelaPreco(tabelaId, fornecedorId, novoStatus);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {!formAberto ? (
        <Button onClick={() => setFormAberto(true)} className="w-fit">
          <Upload className="h-4 w-4" />
          Nova importação
        </Button>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
            <CardTitle className="text-[15px]">Nova Tabela de Preços</CardTitle>
            <button onClick={limparFormulario} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome-tabela">Nome da tabela</Label>
                <Input id="nome-tabela" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Julho/2026" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ATIVA" | "EXPIRADA" | "FUTURA")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-card-sm"
                >
                  <option value="ATIVA">Ativa</option>
                  <option value="FUTURA">Futura</option>
                  <option value="EXPIRADA">Expirada</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vig-inicio">Vigência inicial</Label>
                <Input id="vig-inicio" type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vig-fim">Vigência final</Label>
                <Input id="vig-fim" type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obs-tabela">Observações (opcional)</Label>
              <Input id="obs-tabela" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>

            <div className="border-t border-border pt-4">
              <input ref={inputRef} type="file" accept=".xlsx" onChange={handleArquivo} className="hidden" />
              <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={validando}>
                {validando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {nomeArquivo || "Selecionar planilha padrão (.xlsx)"}
              </Button>
            </div>

            {erro && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {erro}
              </div>
            )}

            {linhas && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{linhas.length} linha(s) lida(s)</span>
                  {totalInconsistencias > 0 ? (
                    <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      {totalInconsistencias} sem código encontrado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Todos os códigos encontrados
                    </span>
                  )}
                </div>

                {avisos.length > 0 && (
                  <div className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                    {avisos.map((a, i) => <div key={i}>{a}</div>)}
                  </div>
                )}

                <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-secondary/50">
                      <tr className="text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Código</th>
                        <th className="px-3 py-2 text-left font-medium">Descrição</th>
                        <th className="px-2 py-2 text-left font-medium">Marca</th>
                        <th className="px-2 py-2 text-right font-medium">Valor Unit.</th>
                        <th className="px-2 py-2 text-left font-medium">Catálogo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {linhas.map((l, i) => (
                        <tr key={i} className={!l.materialEletricoId ? "bg-destructive/5" : undefined}>
                          <td className="px-3 py-2 font-mono text-xs">{l.codigoInterno}</td>
                          <td className="px-3 py-2">{l.descricao}</td>
                          <td className="px-2 py-2 text-muted-foreground">{l.marca}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatBRL(l.valorUnitario)}</td>
                          <td className="px-2 py-2">
                            {l.materialEletricoId ? (
                              <span className="text-xs text-success">✓ {l.materialEletricoNome}</span>
                            ) : (
                              <span className="text-xs font-medium text-destructive">Código não encontrado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  onClick={handleImportar}
                  disabled={importando || totalInconsistencias > 0 || !nome.trim() || !vigenciaInicio || !vigenciaFim}
                  className="w-fit"
                >
                  {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Importar
                </Button>
                {totalInconsistencias > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Corrija os códigos não encontrados na planilha e selecione o arquivo de novo pra continuar.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center gap-2 border-b border-border pb-4">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-[15px]">Histórico de importações</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {tabelasIniciais.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma tabela importada ainda.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {tabelasIniciais.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{t.nome}</span>
                      <select
                        value={t.status}
                        onChange={(e) => handleMudarStatus(t.id, e.target.value as "ATIVA" | "EXPIRADA" | "FUTURA")}
                        className={`rounded-full border-0 px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_COR[t.status] ?? "bg-muted"}`}
                      >
                        <option value="ATIVA">Ativa</option>
                        <option value="FUTURA">Futura</option>
                        <option value="EXPIRADA">Expirada</option>
                      </select>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Vigência {formatData(t.vigenciaInicio)} – {formatData(t.vigenciaFim)} · {t.totalItens} itens · importado
                      por {t.usuarioImportacaoNome} em {formatData(t.dataImportacao)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleVerTabela(t.id)}
                      disabled={carregandoTabela === t.id}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
                      title="Ver itens"
                    >
                      {carregandoTabela === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleExcluir(t.id, t.nome)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Excluir (só pra corrigir erro de importação)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {tabelaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTabelaAberta(null)}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{tabelaAberta.nome}</h3>
                <p className="text-xs text-muted-foreground">
                  Vigência {formatData(tabelaAberta.vigenciaInicio)} – {formatData(tabelaAberta.vigenciaFim)} ·{" "}
                  {STATUS_LABEL[tabelaAberta.status] ?? tabelaAberta.status}
                </p>
              </div>
              <button onClick={() => setTabelaAberta(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Descrição</th>
                    <th className="px-2 py-2 text-left font-medium">Marca</th>
                    <th className="px-2 py-2 text-left font-medium">Prazo</th>
                    <th className="px-2 py-2 text-right font-medium">Valor Unit.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {tabelaAberta.itens.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.descricao}</td>
                      <td className="px-2 py-2 text-muted-foreground">{item.marca}</td>
                      <td className="px-2 py-2 text-muted-foreground">{item.prazoEntrega ?? "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatBRL(item.valorUnitario)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
