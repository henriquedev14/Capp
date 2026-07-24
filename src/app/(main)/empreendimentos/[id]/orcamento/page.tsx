export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  AlertTriangle,
  Info,
  Package,
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
import { CotacoesList } from "@/features/cotacoes/components/cotacoes-list";
import { OrcamentacaoPrismaRepository } from "@/infra/db/prisma/repositories/orcamentacao-prisma-repository";
import { LevantamentoMateriaisPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-materiais-prisma-repository";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { JornadaVisual } from "@/features/orcamentacao/components/jornada-visual";
import { ResponsavelPrazoEditor } from "@/features/orcamentacao/components/responsavel-prazo-editor";
import { podeGerenciarJornada } from "@/features/orcamentacao/actions/jornada-actions";
import { prisma } from "@/infra/db/prisma/client";
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
  // módulo de decisão do cliente). Blindado: se `db push` não rodou ainda,
  // cai pro estado "nunca gerada" sem quebrar a tela.
  let propostaInfo: {
    propostaGeradaEm: string | null;
    documentoId: string | null;
    decisaoCliente: "PENDENTE" | "ACEITA" | "RECUSADA" | null;
  } = { propostaGeradaEm: null, documentoId: null, decisaoCliente: null };
  if (orcamento) {
    try {
      const raw = await prisma.orcamento.findUnique({
        where: { id: orcamento.id },
        select: {
          propostaGeradaEm: true,
          propostaDocumentoId: true,
          decisaoCliente: true,
        },
      });
      if (raw) {
        propostaInfo = {
          propostaGeradaEm: raw.propostaGeradaEm
            ? raw.propostaGeradaEm.toLocaleString("pt-BR")
            : null,
          documentoId: raw.propostaDocumentoId,
          decisaoCliente: (raw.decisaoCliente as "PENDENTE" | "ACEITA" | "RECUSADA" | null) ?? "PENDENTE",
        };
      }
    } catch (e) {
      console.error("[orcamento/page] erro ao carregar campos de proposta:", e);
    }
  }
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

  // Cotações associadas a esta revisão específica do orçamento.
  // Consultado direto no Prisma (sem repo separado) porque é um consumo
  // pontual dessa página. Se depois surgirem mais consumidores, refatoro.
  // Blindado com try/catch: se `db push` não foi rodado depois de adicionar
  // os models de Cotação, o banco ainda não tem a tabela — em vez de derrubar
  // a tela inteira, mostra 0 cotações.
  let cotacoes: {
    id: string;
    numero: string;
    status: string;
    fornecedorNome: string;
    totalGeral: number;
    totalItens: number;
    atualizadoEm: Date;
  }[] = [];
  let erroCotacoes: string | null = null;
  if (orcamento) {
    try {
      const raw = await prisma.cotacao.findMany({
        where: { orcamentoId: orcamento.id },
        include: {
          fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
          _count: { select: { itens: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      cotacoes = raw.map((c) => ({
        id: c.id,
        numero: c.numero,
        status: c.status,
        fornecedorNome: c.fornecedor.nomeFantasia ?? c.fornecedor.razaoSocial,
        totalGeral: Number(c.totalGeral ?? 0),
        totalItens: c._count.itens,
        atualizadoEm: c.updatedAt,
      }));
    } catch (e) {
      // Provável: tabela ainda não existe no banco.
      erroCotacoes =
        "Módulo de Cotações indisponível — rode `docker compose run --rm migrate npx prisma db push` para criar as tabelas.";
      console.error("[orcamento/page] erro ao carregar cotações:", e);
    }
  }

  const fornecedoresAtivos = (
    await prisma.fornecedor.findMany({
      where: { ativo: true },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
      orderBy: { razaoSocial: "asc" },
    })
  ).map((f) => ({ id: f.id, nome: f.nomeFantasia ?? f.razaoSocial }));

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

  return (
    <div className="flex flex-col gap-6">
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
          Ir para Orçamentação
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          breadcrumb={[
            "Empreendimentos",
            empreendimento.nome,
            "Orçamentação",
          ]}
          title="Orçamentação"
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
                      decisaoCliente={propostaInfo.decisaoCliente}
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
                            {temPontosTeto && (
                              <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                                Pontos
                              </th>
                            )}
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
                              {temPontosTeto && (
                                <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                                  {item.pontos ?? "—"}
                                </td>
                              )}
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
                              colSpan={temPontosTeto ? 6 : 5}
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

              {/* Bloco 2 — Materiais */}
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Package className="h-[18px] w-[18px] text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-[15px]">Bloco 2 — Materiais</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Preenchido a partir do Levantamento de Materiais validado de cada tipologia
                      </p>
                    </div>
                  </div>
                  {orcamento && (
                    <AplicarTabelaPrecoButton
                      orcamentoId={orcamento.id}
                      empreendimentoId={params.id}
                      fornecedoresDisponiveis={fornecedoresAtivos}
                    />
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  {orcamento.itensMaterial.length === 0 ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 shrink-0" />
                      Nenhum material ainda — valide o Levantamento de Materiais de alguma tipologia.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {Array.from(
                        orcamento.itensMaterial.reduce((mapa, item) => {
                          const grupo = item.categoria ?? "Outros";
                          if (!mapa.has(grupo)) mapa.set(grupo, []);
                          mapa.get(grupo)!.push(item);
                          return mapa;
                        }, new Map<string, typeof orcamento.itensMaterial>())
                      ).map(([fabricante, itens]) => {
                        const subtotal = itens.reduce((acc, i) => acc + (i.total ?? 0), 0);
                        return (
                          <div key={fabricante} className="rounded-lg border border-border overflow-hidden">
                            <div className="bg-secondary/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                              {fabricante}
                            </div>
                            <table className="w-full text-sm">
                              <tbody className="divide-y divide-border/50">
                                {itens.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-3 py-2 text-foreground">
                                      {item.descricao}
                                      {item.tipologiaNome && (
                                        <span className="ml-2 text-xs text-muted-foreground">({item.tipologiaNome})</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-muted-foreground w-24">{item.marca ?? "—"}</td>
                                    <td className="px-2 py-2 text-right text-muted-foreground w-16">{item.quantidade}</td>
                                    <td className="px-2 py-2 text-muted-foreground w-12">{item.unidade}</td>
                                    <td className="px-2 py-2 text-right font-mono text-muted-foreground w-24">
                                      {formatBRL(item.precoUnitario ?? 0)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-medium w-28">
                                      {formatBRL(item.total ?? 0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex justify-end border-t border-border bg-secondary/30 px-3 py-1.5 text-xs font-semibold">
                              Subtotal {fabricante}: {formatBRL(subtotal)}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex justify-end rounded-lg bg-primary/10 px-4 py-3">
                        <span className="text-base font-bold text-primary">
                          Total Materiais: {formatBRL(orcamento.totalMateriais ?? 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cotações geradas a partir deste orçamento */}
              {erroCotacoes ? (
                <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-warning">
                  {erroCotacoes}
                </div>
              ) : (
                <CotacoesList empreendimentoId={params.id} cotacoes={cotacoes} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
