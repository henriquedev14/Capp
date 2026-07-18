"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extrairPrecosCotacao, type ItemCotacaoExtraido } from "@/features/cotacoes/lib/extrair-precos-cotacao";
import {
  sugerirItemCotacaoParaImport,
  listarItensCotacaoParaImport,
  atualizarPrecoCotacaoItem,
  mudarStatusCotacao,
  identificarMelhorCotacao,
  salvarCodigoFornecedorParaMaterial,
  type SugestaoItemCotacao,
  type CotacaoPendenteFornecedor,
} from "@/features/cotacoes/actions/cotacao-actions";

interface Props {
  fornecedorId: string;
  cotacoesPendentes: CotacaoPendenteFornecedor[];
}

interface LinhaRevisao extends ItemCotacaoExtraido {
  selecionado: boolean;
  cotacaoItemId: string | null;
  /** Material do catálogo ligado ao item escolhido — usado pra aprender o código na confirmação. */
  materialEletricoId: string | null;
}

/**
 * Import de PDF de resposta do fornecedor, feito a partir da PÁGINA DO
 * FORNECEDOR (não de uma cotação específica) — a pessoa só sobe o PDF,
 * e o sistema identifica sozinho qual cotação pendente desse fornecedor
 * bate melhor com os itens encontrados, sempre deixando claro qual
 * escolheu e com opção de trocar antes de aplicar.
 */
export function ImportarCotacaoFornecedorView({ fornecedorId, cotacoesPendentes }: Props) {
  const router = useRouter();
  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const [extraindo, setExtraindo] = React.useState(false);
  const [cotacaoEscolhidaId, setCotacaoEscolhidaId] = React.useState<string | null>(null);
  const [identificacaoAutomatica, setIdentificacaoAutomatica] = React.useState(false);
  const [linhas, setLinhas] = React.useState<LinhaRevisao[]>([]);
  const [itensCotacao, setItensCotacao] = React.useState<SugestaoItemCotacao[]>([]);
  const [erro, setErro] = React.useState<string | null>(null);
  const [confirmando, setConfirmando] = React.useState(false);
  const [avisoNenhumItem, setAvisoNenhumItem] = React.useState(false);

  async function handleExtrair() {
    setErro(null);
    setAvisoNenhumItem(false);
    setLinhas([]);
    if (!arquivo) {
      setErro("Escolha o arquivo PDF que o fornecedor mandou.");
      return;
    }
    if (cotacoesPendentes.length === 0) {
      setErro("Esse fornecedor não tem nenhuma cotação pendente no momento.");
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

      // Identifica sozinho qual cotação pendente bate melhor — só avisa
      // qual escolheu, a pessoa pode trocar no dropdown antes de seguir.
      const descricoes = resultado.itens.map((i) => i.descricao);
      const melhor = await identificarMelhorCotacao(fornecedorId, descricoes);
      const cotacaoId = melhor?.cotacaoId ?? cotacoesPendentes[0]!.cotacaoId;
      setCotacaoEscolhidaId(cotacaoId);
      setIdentificacaoAutomatica(!!melhor && melhor.pontuacao > 0);

      const todosItens = await listarItensCotacaoParaImport(cotacaoId);
      setItensCotacao(todosItens);

      const linhasComSugestao = await Promise.all(
        resultado.itens.map(async (item) => {
          const sugestao = await sugerirItemCotacaoParaImport(cotacaoId, fornecedorId, {
            codigo: item.codigo,
            descricao: item.descricao,
          });
          return {
            ...item,
            selecionado: !!sugestao,
            cotacaoItemId: sugestao?.cotacaoItemId ?? null,
            materialEletricoId: sugestao?.materialEletricoId ?? null,
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

  // Se a pessoa trocar a cotação escolhida manualmente, recarrega os
  // itens dela e refaz as sugestões de match.
  async function handleTrocarCotacao(novaCotacaoId: string) {
    setCotacaoEscolhidaId(novaCotacaoId);
    setIdentificacaoAutomatica(false);
    const todosItens = await listarItensCotacaoParaImport(novaCotacaoId);
    setItensCotacao(todosItens);
    const linhasComSugestao = await Promise.all(
      linhas.map(async (linha) => {
        const sugestao = await sugerirItemCotacaoParaImport(novaCotacaoId, fornecedorId, {
          codigo: linha.codigo,
          descricao: linha.descricao,
        });
        return {
          ...linha,
          cotacaoItemId: sugestao?.cotacaoItemId ?? null,
          materialEletricoId: sugestao?.materialEletricoId ?? null,
        };
      })
    );
    setLinhas(linhasComSugestao);
  }

  async function handleConfirmar() {
    setErro(null);
    if (!cotacaoEscolhidaId) return;
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

        // Aprende o código do fornecedor pra esse material — próximas
        // importações desse mesmo fornecedor casam esse item sozinhas,
        // sem precisar de descrição (nem sempre disponível no PDF dele).
        if (linha.codigo && linha.materialEletricoId) {
          await salvarCodigoFornecedorParaMaterial(fornecedorId, linha.codigo, linha.materialEletricoId);
        }
      }
      await mudarStatusCotacao(cotacaoEscolhidaId, "RESPONDIDA");
      router.push(`/fornecedores/${fornecedorId}`);
      router.refresh();
    } catch {
      setErro("Erro ao aplicar os preços. Tenta de novo.");
    } finally {
      setConfirmando(false);
    }
  }

  const cotacaoAtual = cotacoesPendentes.find((c) => c.cotacaoId === cotacaoEscolhidaId);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">1. Escolher o PDF que o fornecedor mandou</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-5">
          {cotacoesPendentes.length === 0 ? (
            <p className="rounded-md bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              Esse fornecedor não tem nenhuma cotação pendente (Enviada/Respondida) no momento.
            </p>
          ) : (
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          )}
          <Button onClick={handleExtrair} disabled={extraindo || !arquivo || cotacoesPendentes.length === 0} className="w-fit">
            {extraindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Extrair e identificar cotação
          </Button>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {avisoNenhumItem && (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
              Não consegui identificar nenhuma linha de item nesse PDF. O layout desse fornecedor pode ser diferente
              do esperado — você ainda pode preencher os preços manualmente na cotação.
            </p>
          )}
        </CardContent>
      </Card>

      {cotacaoEscolhidaId && linhas.length > 0 && (
        <>
          <Card className={identificacaoAutomatica ? "border-l-4 border-l-success" : "border-l-4 border-l-warning"}>
            <CardContent className="flex items-center gap-3 pt-5">
              <Sparkles className={`h-4 w-4 shrink-0 ${identificacaoAutomatica ? "text-success" : "text-warning"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {identificacaoAutomatica
                    ? "Identificamos automaticamente qual cotação é essa:"
                    : "Não tenho certeza qual cotação é — confirma ou troca abaixo:"}
                </p>
                <select
                  value={cotacaoEscolhidaId}
                  onChange={(e) => handleTrocarCotacao(e.target.value)}
                  className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {cotacoesPendentes.map((c) => (
                    <option key={c.cotacaoId} value={c.cotacaoId}>
                      {c.numero} — {c.empreendimentoNome} ({c.quantidadeItens} itens)
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-[15px]">
                2. Revisar antes de aplicar ({linhas.length} linha(s) encontrada(s)) — {cotacaoAtual?.numero}
              </CardTitle>
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
                      <p className="truncate text-sm text-muted-foreground">
                        {linha.codigo && (
                          <span className="mr-1.5 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                            {linha.codigo}
                          </span>
                        )}
                        PDF: {linha.descricao}
                      </p>
                      <select
                        value={linha.cotacaoItemId ?? ""}
                        onChange={(e) => {
                          const novoId = e.target.value || null;
                          const itemEscolhido = itensCotacao.find((it) => it.cotacaoItemId === novoId);
                          setLinhas((prev) =>
                            prev.map((l, idx) =>
                              idx === i
                                ? {
                                    ...l,
                                    cotacaoItemId: novoId,
                                    materialEletricoId: itemEscolhido?.materialEletricoId ?? null,
                                  }
                                : l
                            )
                          );
                        }}
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
        </>
      )}
    </div>
  );
}
