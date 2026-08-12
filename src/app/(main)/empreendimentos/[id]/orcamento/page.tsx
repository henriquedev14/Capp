export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  AlertTriangle,
  Info,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/features/tiers/components/tier-badge";
import { StatusOrcamentoBadge } from "@/features/orcamentacao/components/status-orcamento-badge";
import { NovoOrcamentoButton } from "@/features/orcamentacao/components/novo-orcamento-button";
import { MudarStatusButton } from "@/features/orcamentacao/components/mudar-status-button";
import { DeletarOrcamentoButton } from "@/features/orcamentacao/components/deletar-orcamento-button";
import { GerarPropostaButton } from "@/features/orcamentacao/components/gerar-proposta-button";
import { ehGestorSenior } from "@/infra/auth/eh-gestor-senior";
import { GerarCotacaoButton } from "@/features/cotacoes/components/gerar-cotacao-button";
import { OrcamentacaoPrismaRepository } from "@/infra/db/prisma/repositories/orcamentacao-prisma-repository";
import { LevantamentoMateriaisPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-materiais-prisma-repository";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { JornadaVisual } from "@/features/orcamentacao/components/jornada-visual";
import { ResponsavelPrazoEditor } from "@/features/orcamentacao/components/responsavel-prazo-editor";
import { podeGerenciarJornada } from "@/features/orcamentacao/actions/jornada-actions";
import { ValorLivreCard } from "@/features/orcamentacao/components/valor-livre-card";
import { ToggleCriterioLivre } from "@/features/orcamentacao/components/toggle-criterio-livre";
import { prisma } from "@/infra/db/prisma/client";
import { buscarInfoPropostaOrcamento, listarCotacoesDoOrcamento, listarFornecedoresAtivosResumo } from "@/features/orcamentacao/actions/orcamento-actions";
import { consolidarItensPorMaterial } from "@/core/orcamentacao/use-cases/consolidar-itens-material";
import { CotacoesUnificadas } from "@/features/cotacoes/components/cotacoes-unificadas";
import { buscarTodasCotacoesDetalhadas } from "@/features/cotacoes/actions/buscar-todas-detalhadas";
import { getTierOption } from "@/features/tiers/constants";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { cn } from "@/lib/utils";
import { AplicarTabelaPrecoButton } from "@/features/orcamentacao/components/aplicar-tabela-preco-button";

const repo = new OrcamentacaoPrismaRepository();
const levantamentoMateriaisRepo = new LevantamentoMateriaisPrismaRepository();
const empRepo = new EmpreendimentoPrismaRepository();
const usuarioRepo = new UsuarioPrismaRepository();

function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const KIT_LABEL: Record<string, string> = {
  ELETRICO: "Elétrico",
  HIDRAULICO: "Hidráulico",
  QDC: "QDC",
};

interface Props {
  params: { id: string };
  searchParams: { rev?: string };
}

export default async function OrcamentoPage({ params, searchParams }: Props) {
  const empreendimento = await empRepo.findById(params.id);
  if (!empreendimento) notFound();

  const [revisoes, podeAprovar] = await Promise.all([
    repo.listarPorEmpreendimento(params.id),
    temPermissao(PERMISSOES.EMPREENDIMENTO_APROVAR_PROPOSTA),
  ]);

  // Revisão selecionada: searchParams.rev ou a mais recente
  const revSelecionada = searchParams.rev
    ? parseInt(searchParams.rev, 10)
    : (revisoes[0]?.revisao ?? null);

  const orcamento = revSelecionada
    ? await repo.buscarPorId(
        revisoes.find((r) => r.revisao === revSelecionada)?.id ?? ""
      )
    : null;

  // Campos de trava da proposta — consultados à parte porque o repo/entity
  // de Orcamento ainda não os mapeia (adicionados depois, junto com o
  // módulo de decisão do cliente).
  const propostaInfo = orcamento
    ? await buscarInfoPropostaOrcamento(orcamento.id)
    : { propostaGeradaEm: null, documentoId: null, decisaoCliente: null };
  const podeSobrescreverProposta = await ehGestorSenior();

  // Jornada, responsáveis disponíveis e permissão de gerenciar — usados no
  // cabeçalho fixo e na jornada visual. Blindado com try/catch: se `db push`
  // ainda não rodou nesta VM, cai pro estado vazio sem quebrar a tela.
  let jornada: Awaited<ReturnType<typeof repo.buscarJornada>> = [];
  if (orcamento) {
    try {
      jornada = await repo.buscarJornada(orcamento.id);
    } catch (e) {
      console.error("[orcamento/page] erro ao carregar jornada:", e);
    }
  }
  const [todosUsuarios, podeGerenciar] = await Promise.all([
    usuarioRepo.findMany(),
    podeGerenciarJornada(),
  ]);
  const responsaveisAtivos = todosUsuarios
    .filter((u) => u.ativo)
    .map((u) => ({ id: u.id, nome: u.nome }));
  const responsavelAtual = orcamento?.responsavelId
    ? todosUsuarios.find((u) => u.id === orcamento.responsavelId)
    : null;

  // Cotações associadas a esta revisão específica do orçamento —
  // extraído pra listarCotacoesDoOrcamento em 2.2.1 (item A4).
  const { cotacoes, erro: erroCotacoes } = orcamento
    ? await listarCotacoesDoOrcamento(orcamento.id)
    : { cotacoes: [], erro: null };
  const cotacoesDetalhadas =
    cotacoes.length > 0 && orcamento ? await buscarTodasCotacoesDetalhadas(orcamento.id, params.id) : [];

  const fornecedoresAtivos = await listarFornecedoresAtivosResumo();

  // Trava da proposta: além do orçamento estar aprovado, toda tipologia
  // que tem item de serviço do kit Elétrico precisa ter Levantamento de
  // Materiais VALIDADO — sem isso, a proposta fica bloqueada.
  let materiaisProntos = true;
  let tipologiasSemMaterial: string[] = [];
  if (orcamento) {
    const tipologiasComEletrico = Array.from(
      new Set(
        orcamento.itensServico
          .filter((i) => i.kit === "ELETRICO" && i.tipologiaId)
          .map((i) => i.tipologiaId as string)
      )
    );
    if (tipologiasComEletrico.length > 0) {
      const levantamentosMateriais = await levantamentoMateriaisRepo.buscarTodosPorEmpreendimento(params.id);
      tipologiasSemMaterial = tipologiasComEletrico
        .filter((tid) => !levantamentosMateriais.some((l) => l.tipologiaId === tid && l.status === "VALIDADO"))
        .map((tid) => orcamento.itensServico.find((i) => i.tipologiaId === tid)?.tipologiaNome ?? tid);
      materiaisProntos = tipologiasSemMaterial.length === 0;
    }
  }

  const tier = empreendimento.tier ?? 2;
  const tierOption = getTierOption(tier);
  const temPontosTeto = orcamento?.itensServico.some((i) => i.pontos != null) ?? false;

  // Kits contratados
  const kitsAtivos = [
    empreendimento.kitEletrico && "ELETRICO",
    empreendimento.kitHidraulico && "HIDRAULICO",
    empreendimento.kitQdc && "QDC",
  ].filter(Boolean) as string[];

  // Critério "Livre" — marcado direto nesse orçamento (não no cadastro
  // do Empreendimento). Busca simples e isolada pra não depender da
  // entidade complexa do Orçamento. Pedido pelo Henrique em 11/08/2026.
  const criterioLivreRow = orcamento
    ? await prisma.orcamento.findUnique({ where: { id: orcamento.id }, select: { criterioLivre: true } })
    : null;
  const criterioLivreAtivo = criterioLivreRow?.criterioLivre ?? false;

  return (
    <div className="flex flex-col gap-6">
      {orcamento && (
        <div className="rounded-xl border border-border bg-card p-4">
          <ToggleCriterioLivre orcamentoId={orcamento.id} ativo={criterioLivreAtivo} />
        </div>
      )}
      {criterioLivreAtivo && (
        <ValorLivreCard
          empreendimentoId={params.id}
          eletrico={empreendimento.precoFixoEletrico ?? null}
          hidraulico={empreendimento.precoFixoHidraulico ?? null}
          qdc={empreendimento.precoFixoQdc ?? null}
        />
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={`/empreendimentos/${params.id}`}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao empreendimento
        </Link>
        <Link
          href="/orcamentacao"
          className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <Calculator className="h-4 w-4" />
          Ir para Engenharia
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          breadcrumb={[
            "Empreendimentos",
            empreendimento.nome,
            "Engenharia",
          ]}
          title="Engenharia"
          description={empreendimento.nome}
        />
        <NovoOrcamentoButton
          empreendimentoId={params.id}
          tier={tier}
        />
      </div>

      {/* Jornada visual — só aparece quando há um orçamento selecionado */}
      {orcamento && (
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <JornadaVisual jornada={jornada} />
        </div>
      )}

      {/* Aviso: kits não configurados */}
      {kitsAtivos.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Este empreendimento não possui kits contratados configurados.
            {" "}
            <Link
              href={`/empreendimentos/${params.id}/editar`}
              className="font-medium underline underline-offset-2"
            >
              Editar empreendimento
            </Link>{" "}
            para ativar os kits antes de criar um orçamento.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Coluna lateral — revisões */}
        <div className="flex flex-col gap-3 lg:col-span-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Revisões
          </h2>

          {revisoes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
              <Calculator className="h-7 w-7 text-muted-foreground/40" />
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Aguardando levantamento
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                Nenhum orçamento criado ainda.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {revisoes.map((rev) => {
                const ativo = rev.revisao === revSelecionada;
                return (
                  <Link
                    key={rev.id}
                    href={`/empreendimentos/${params.id}/orcamento?rev=${rev.revisao}`}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      ativo
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/20 hover:bg-secondary/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("font-semibold", ativo ? "text-primary" : "text-foreground")}>
                        Rev. {rev.revisao}
                      </span>
                      <StatusOrcamentoBadge status={rev.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <TierBadge tier={rev.tier} />
                      <span>
                        {formatBRL(
                          (rev.totalServicosHgi ?? 0) + (rev.totalMateriais ?? 0)
                        )}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna principal — detalhe do orçamento selecionado */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {!orcamento ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <Calculator className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                {revisoes.length === 0
                  ? 'Clique em "Nova revisão" para gerar o primeiro orçamento.'
                  : "Selecione uma revisão ao lado."}
              </p>
            </div>
          ) : (
            <>
              {/* Cabeçalho do orçamento */}
              <Card>
                <CardHeader className="flex flex-col gap-4 border-b border-border pb-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[15px] font-semibold">
                        Revisão {orcamento.revisao}
                      </h2>
                      <StatusOrcamentoBadge status={orcamento.status} size="md" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TierBadge tier={orcamento.tier} size="md" />
                      <span className="text-xs text-muted-foreground">
                        Criado em{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(orcamento.createdAt)}
                      </span>
                    </div>
                    <ResponsavelPrazoEditor
                      orcamentoId={orcamento.id}
                      empreendimentoId={params.id}
                      responsaveis={responsaveisAtivos}
                      responsavelIdAtual={orcamento.responsavelId ?? null}
                      responsavelNomeAtual={responsavelAtual?.nome ?? null}
                      dataPrazoAtual={
                        orcamento.dataPrazo
                          ? orcamento.dataPrazo.toISOString().slice(0, 10)
                          : null
                      }
                      podeEditar={podeGerenciar}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <GerarPropostaButton
                      orcamentoId={orcamento.id}
                      podeGerar={orcamento.status === "ORCAMENTO_APROVADO" && materiaisProntos}
                      motivoBloqueio={
                        orcamento.status !== "ORCAMENTO_APROVADO"
                          ? "Só libera com o orçamento aprovado pelo gestor"
                          : !materiaisProntos
                          ? `Falta validar materiais de: ${tipologiasSemMaterial.join(", ")}`
                          : undefined
                      }
                      propostaJaGerada={!!propostaInfo.propostaGeradaEm}
                      propostaGeradaEm={propostaInfo.propostaGeradaEm}
                      documentoId={propostaInfo.documentoId}
                      podeSobrescrever={podeSobrescreverProposta}
                    />
                    <GerarCotacaoButton
                      orcamentoId={orcamento.id}
                      desabilitado={!materiaisProntos}
                      motivoBloqueio={
                        !materiaisProntos
                          ? `Valide o Levantamento de Materiais antes: ${tipologiasSemMaterial.join(", ")}`
                          : undefined
                      }
                    />
                    <MudarStatusButton
                      orcamentoId={orcamento.id}
                      empreendimentoId={params.id}
                      statusAtual={orcamento.status}
                      podeAprovar={podeAprovar}
                    />
                    {orcamento.status === "EM_LEVANTAMENTO" && (
                      <DeletarOrcamentoButton
                        orcamentoId={orcamento.id}
                        empreendimentoId={params.id}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Totais resumidos */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {temPontosTeto && (
                      <>
                        <div className="flex flex-col rounded-lg bg-secondary/50 px-4 py-3">
                          <span className="text-xs text-muted-foreground">Média de pontos de teto</span>
                          <span className="mt-1 text-lg font-semibold tabular-nums">
                            {orcamento.itensServico[0]?.pontos?.toFixed(2) ?? "—"}
                          </span>
                        </div>
                        <div className="flex flex-col rounded-lg bg-secondary/50 px-4 py-3">
                          <span className="text-xs text-muted-foreground">Preço por apartamento</span>
                          <span className="mt-1 text-lg font-semibold tabular-nums">
                            {formatBRL(orcamento.itensServico[0]?.precoUnitario ?? null)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex flex-col rounded-lg bg-secondary/50 px-4 py-3">
                      <span className="text-xs text-muted-foreground">Serviço HGI</span>
                      <span className="mt-1 text-lg font-semibold tabular-nums">
                        {formatBRL(orcamento.totalServicosHgi)}
                      </span>
                    </div>
                    <div className="flex flex-col rounded-lg bg-secondary/50 px-4 py-3">
                      <span className="text-xs text-muted-foreground">Materiais</span>
                      <span className="mt-1 text-lg font-semibold tabular-nums">
                        {formatBRL(orcamento.totalMateriais)}
                      </span>
                    </div>
                    <div className="flex flex-col rounded-lg bg-primary/8 border border-primary/20 px-4 py-3 sm:col-span-1 col-span-2">
                      <span className="text-xs text-primary font-medium">Total geral</span>
                      <span className="mt-1 text-lg font-bold text-primary tabular-nums">
                        {formatBRL(
                          (orcamento.totalServicosHgi ?? 0) +
                            (orcamento.totalMateriais ?? 0)
                        )}
                      </span>
                    </div>
                  </div>
                  {orcamento.observacoes && (
                    <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-4">
                      {orcamento.observacoes}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Bloco 1 — Serviço HGI */}
              <Card>
                <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                    <Calculator className="h-[18px] w-[18px] text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-[15px]">
                      Bloco 1 — Serviço HGI
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Multiplicador {tierOption?.nome ?? `Tier ${orcamento.tier}`}{" "}
                      ×{tierOption?.multiplicadorReferencia.toFixed(2)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {orcamento.itensServico.length === 0 ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 shrink-0" />
                      Nenhuma tipologia com unidades vinculadas encontrada. Verifique a estrutura do empreendimento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Tipologia
                            </th>
                            <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Kit
                            </th>
                            <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Qtd.
                            </th>
                            <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                              Preço base
                            </th>
                            <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                              Unit. c/ tier
                            </th>
                            <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {orcamento.itensServico.map((item) => (
                            <tr key={item.id} className="hover:bg-secondary/20">
                              <td className="py-2.5 pr-4 font-medium">
                                {item.tipologiaNome}
                              </td>
                              <td className="py-2.5 pr-4 text-muted-foreground">
                                {KIT_LABEL[item.kit] ?? item.kit}
                              </td>
                              <td className="py-2.5 pr-4 text-right tabular-nums">
                                {item.quantidade}
                              </td>
                              <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                                {formatBRL(item.precoBase)}
                              </td>
                              <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                                {formatBRL(item.precoUnitario)}
                              </td>
                              <td className="py-2.5 text-right tabular-nums font-semibold">
                                {formatBRL(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td
                              colSpan={5}
                              className="py-2.5 text-right text-sm font-medium text-muted-foreground hidden sm:table-cell"
                            >
                              Subtotal Serviço HGI
                            </td>
                            <td
                              colSpan={3}
                              className="py-2.5 text-right text-sm font-medium text-muted-foreground sm:hidden"
                            >
                              Subtotal
                            </td>
                            <td className="py-2.5 text-right tabular-nums text-base font-bold">
                              {formatBRL(orcamento.totalServicosHgi)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cotações geradas a partir deste orçamento — visão unificada
                  por abas (Etapa 1 da unificação, 06/08/2026) */}
              {erroCotacoes ? (
                <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-warning">
                  {erroCotacoes}
                </div>
              ) : (
                <CotacoesUnificadas
                  cotacoes={cotacoesDetalhadas}
                  totalMateriais={orcamento?.totalMateriais ?? 0}
                  aplicarTabelaPrecoSlot={
                    orcamento && (
                      <AplicarTabelaPrecoButton
                        orcamentoId={orcamento.id}
                        empreendimentoId={params.id}
                        fornecedoresDisponiveis={fornecedoresAtivos}
                      />
                    )
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
