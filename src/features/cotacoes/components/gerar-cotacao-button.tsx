"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  X,
  Check,
  Loader2,
  AlertTriangle,
  Info,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  previewGeracaoCotacoes,
  gerarCotacoes,
  type PreviewGeracao,
} from "@/features/cotacoes/actions/cotacao-actions";

interface Props {
  orcamentoId: string;
  // Bloqueia o botão se o orçamento não estiver em um status compatível.
  desabilitado?: boolean;
  motivoBloqueio?: string;
}

export function GerarCotacaoButton({
  orcamentoId,
  desabilitado,
  motivoBloqueio,
}: Props) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [carregando, setCarregando] = React.useState(false);
  const [preview, setPreview] = React.useState<PreviewGeracao | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [selecionados, setSelecionados] = React.useState<Set<string>>(new Set());
  const [gerando, setGerando] = React.useState(false);
  const [detalhesBloqueio, setDetalhesBloqueio] = React.useState<
    | { fornecedorNome: string; itensSemPreco: { descricao: string; fabricante: string }[] }[]
    | null
  >(null);

  async function abrir() {
    setAberto(true);
    setCarregando(true);
    setErro(null);
    setPreview(null);
    setSelecionados(new Set());
    setDetalhesBloqueio(null);

    const r = await previewGeracaoCotacoes(orcamentoId);
    setCarregando(false);
    if ("erro" in r) {
      setErro(r.erro);
    } else {
      setPreview(r);
    }
  }

  function fechar() {
    if (gerando) return;
    setAberto(false);
  }

  function toggle(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function confirmar() {
    if (selecionados.size === 0) return;
    setGerando(true);
    setDetalhesBloqueio(null);
    const r = await gerarCotacoes(orcamentoId, Array.from(selecionados));
    setGerando(false);
    if (r.erro) {
      setErro(r.erro);
      if (r.detalhesBloqueio) setDetalhesBloqueio(r.detalhesBloqueio);
      return;
    }
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={abrir}
        disabled={desabilitado}
        title={
          desabilitado
            ? motivoBloqueio
            : "Consultar preço com fornecedores a partir do levantamento validado"
        }
      >
        <FileSpreadsheet className="mr-1.5 h-4 w-4" />
        Gerar Cotação
      </Button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={fechar}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-background shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Gerar Cotações</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Cria um documento de cotação para cada fornecedor escolhido, usando os
                  preços que ele já tem cadastrados.
                </p>
                <ol className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <li>
                    <strong className="text-foreground">1.</strong> O sistema pega os itens do
                    Levantamento de Materiais validado (já consolidados de todas as tipologias)
                  </li>
                  <li>
                    <strong className="text-foreground">2.</strong> Você escolhe abaixo quais
                    fornecedores devem ser consultados
                  </li>
                  <li>
                    <strong className="text-foreground">3.</strong> Cada fornecedor selecionado
                    ganha sua própria cotação — só com os itens que ele vende, no preço que
                    está cadastrado nele. Você edita os preços depois se o fornecedor responder
                    diferente
                  </li>
                </ol>
              </div>
              <button
                onClick={fechar}
                disabled={gerando}
                className="rounded p-1 text-muted-foreground hover:bg-secondary shrink-0"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {carregando ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando fornecedores...
                </div>
              ) : erro ? (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{erro}</span>
                  </div>
                  {detalhesBloqueio && detalhesBloqueio.length > 0 && (
                    <DetalhesBloqueio detalhes={detalhesBloqueio} />
                  )}
                </div>
              ) : preview ? (
                <PreviewBody
                  preview={preview}
                  selecionados={selecionados}
                  onToggle={toggle}
                />
              ) : null}
            </div>

            {/* Footer */}
            {preview && !carregando && (
              <div className="flex items-center justify-between gap-3 border-t border-border bg-secondary/30 px-6 py-3">
                <span className="text-xs text-muted-foreground">
                  {selecionados.size} fornecedor{selecionados.size === 1 ? "" : "es"} selecionado
                  {selecionados.size === 1 ? "" : "s"}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fechar} disabled={gerando}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={confirmar}
                    disabled={selecionados.size === 0 || gerando}
                  >
                    {gerando ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" />
                    )}
                    Gerar {selecionados.size} cotação{selecionados.size === 1 ? "" : "ões"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PreviewBody({
  preview,
  selecionados,
  onToggle,
}: {
  preview: PreviewGeracao;
  selecionados: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Resumo do levantamento consolidado */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          Consolidado: <strong className="text-foreground">{preview.totalItensConsolidados}</strong>{" "}
          itens distintos de {preview.levantamentosValidados} tipologia
          {preview.levantamentosValidados === 1 ? "" : "s"} validada
          {preview.levantamentosValidados === 1 ? "" : "s"}
          {preview.itensSemFk > 0 && (
            <>
              {" · "}
              <span className="text-warning">
                {preview.itensSemFk} sem referência ao catálogo (ignorados)
              </span>
            </>
          )}
        </span>
      </div>

      {/* Aviso: itens que nenhum fornecedor cadastrado tem */}
      {preview.itensNaoCotaveisPorNinguem.length > 0 && (
        <NaoCotaveisPorNinguem itens={preview.itensNaoCotaveisPorNinguem} />
      )}

      {/* Lista de fornecedores */}
      {preview.fornecedores.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum fornecedor ativo cadastrado.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {preview.fornecedores.map((f) => (
            <FornecedorRow
              key={f.id}
              fornecedor={f}
              selecionado={selecionados.has(f.id)}
              onToggle={() => onToggle(f.id)}
              totalConsolidado={preview.totalItensConsolidados}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FornecedorRow({
  fornecedor,
  selecionado,
  onToggle,
  totalConsolidado,
}: {
  fornecedor: PreviewGeracao["fornecedores"][number];
  selecionado: boolean;
  onToggle: () => void;
  totalConsolidado: number;
}) {
  const bloqueado = fornecedor.itensCotaveisSemPreco.length > 0;
  const semNadaCotavel = fornecedor.itensCotaveis === 0;
  const desabilitado = bloqueado || semNadaCotavel;

  const cobertura = totalConsolidado > 0 ? (fornecedor.itensCotaveis / totalConsolidado) * 100 : 0;

  return (
    <button
      type="button"
      onClick={desabilitado ? undefined : onToggle}
      disabled={desabilitado}
      className={
        "flex flex-col gap-2 rounded-lg border px-4 py-3 text-left transition-colors " +
        (desabilitado
          ? "border-border/60 bg-muted/30 opacity-60 cursor-not-allowed"
          : selecionado
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-secondary/40")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={
              "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors " +
              (selecionado
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background")
            }
          >
            {selecionado && <Check className="h-3 w-3" />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{fornecedor.nome}</div>
            <div className="text-xs text-muted-foreground">
              {fornecedor.totalProdutosCadastrados} produto
              {fornecedor.totalProdutosCadastrados === 1 ? "" : "s"} cadastrado
              {fornecedor.totalProdutosCadastrados === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums text-foreground">
            {fornecedor.itensCotaveis}
            <span className="text-muted-foreground">/{totalConsolidado}</span>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">cotáveis</div>
        </div>
      </div>

      {/* Barra de cobertura */}
      <div className="h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={
            "h-full transition-all " +
            (cobertura >= 80
              ? "bg-success"
              : cobertura >= 50
                ? "bg-primary"
                : cobertura > 0
                  ? "bg-warning"
                  : "bg-muted")
          }
          style={{ width: `${cobertura}%` }}
        />
      </div>

      {/* Avisos */}
      {semNadaCotavel && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Este fornecedor não tem nenhum item do levantamento em seu catálogo.</span>
        </div>
      )}
      {bloqueado && (
        <div className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            {fornecedor.itensCotaveisSemPreco.length} produto
            {fornecedor.itensCotaveisSemPreco.length === 1 ? "" : "s"} sem preço cadastrado —
            edite os preços em <em>Fornecedores</em> antes de gerar.
          </span>
        </div>
      )}
    </button>
  );
}

function NaoCotaveisPorNinguem({
  itens,
}: {
  itens: PreviewGeracao["itensNaoCotaveisPorNinguem"];
}) {
  const [expandido, setExpandido] = React.useState(false);
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-xs font-medium text-warning"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">
          {itens.length} item{itens.length === 1 ? "" : "s"} do levantamento não tem cadastro em
          nenhum fornecedor ativo
        </span>
        <ChevronDown
          className={"h-3.5 w-3.5 transition-transform " + (expandido ? "rotate-180" : "")}
        />
      </button>
      {expandido && (
        <ul className="mt-2 flex flex-col gap-1 pl-5 text-xs text-warning/80">
          {itens.slice(0, 20).map((i) => (
            <li key={i.materialEletricoId}>
              <span className="font-medium">{i.descricao}</span>
              <span className="text-warning/60"> — {i.fabricante} · qtd. {i.quantidade}</span>
            </li>
          ))}
          {itens.length > 20 && (
            <li className="text-warning/60">... e mais {itens.length - 20} item(s)</li>
          )}
        </ul>
      )}
    </div>
  );
}

function DetalhesBloqueio({
  detalhes,
}: {
  detalhes: { fornecedorNome: string; itensSemPreco: { descricao: string; fabricante: string }[] }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {detalhes.map((d) => (
        <div key={d.fornecedorNome} className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <div className="mb-1.5 text-sm font-medium text-destructive">{d.fornecedorNome}</div>
          <ul className="flex flex-col gap-0.5 pl-4 text-xs text-destructive/80 list-disc">
            {d.itensSemPreco.slice(0, 10).map((i, idx) => (
              <li key={idx}>
                {i.descricao} <span className="opacity-70">— {i.fabricante}</span>
              </li>
            ))}
            {d.itensSemPreco.length > 10 && (
              <li className="opacity-70">... e mais {d.itensSemPreco.length - 10} item(s)</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
