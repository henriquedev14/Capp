"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/infra/auth/auth-options.full";
import { OrcamentacaoPrismaRepository } from "@/infra/db/prisma/repositories/orcamentacao-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { LevantamentoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-prisma-repository";
import { LevantamentoHidraulicoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-hidraulico-prisma-repository";
import { LevantamentoMateriaisPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-materiais-prisma-repository";
import { prisma } from "@/infra/db/prisma/client";
import { calcularItensServico, type KitContratado } from "@/core/orcamentacao/use-cases/calcular-itens-servico";
import { calcularPontosMedioPorApartamento } from "@/core/orcamentacao/use-cases/calcular-pontos-teto-medio";
import { exigirPermissao, temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { StatusOrcamento } from "@/core/orcamentacao/entities/orcamento";
import { verificarEmpreendimentoNaoArquivado } from "@/core/empreendimentos/use-cases/guarda-empreendimento-arquivado";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

const repo = new OrcamentacaoPrismaRepository();
const estruturaRepo = new EstruturaFisicaPrismaRepository();
const empRepo = new EmpreendimentoPrismaRepository();
const levantamentoRepo = new LevantamentoPrismaRepository();
const levantamentoHidraulicoRepo = new LevantamentoHidraulicoPrismaRepository();
const levantamentoMateriaisRepo = new LevantamentoMateriaisPrismaRepository();

/**
 * Cria uma nova revisão de orçamento para o empreendimento.
 * Calcula automaticamente os itens de serviço HGI com base nas tipologias,
 * quantidades de unidades, tabela de preços e tier do empreendimento.
 *
 * Regra: se a última revisão já estiver com status ORCAMENTO_APROVADO, não
 * é possível criar uma nova — só um gestor pode reabrir (devolvendo ou
 * movendo de volta para "Em levantamento") antes de uma nova revisão ser
 * gerada.
 */
/**
 * Liga/desliga o critério "Livre" pra ESSE orçamento específico —
 * marcado direto na tela (não no cadastro do Empreendimento). Ao
 * ligar, recalcula os itens de serviço usando valor fixo × total de
 * unidades do empreendimento; ao desligar, recalcula usando o critério
 * normal (área/pontos/tier). Pedido pelo Henrique em 11/08/2026.
 */
export async function alternarCriterioLivreOrcamento(
  orcamentoId: string,
  ativar: boolean
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ORCAMENTO_APLICAR_PRECO);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const orcamento = await prisma.orcamento.findUnique({
    where: { id: orcamentoId },
    select: { empreendimentoId: true, tier: true },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };

  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: orcamento.empreendimentoId },
    select: {
      kitEletrico: true,
      kitHidraulico: true,
      kitQdc: true,
      precoFixoEletrico: true,
      precoFixoHidraulico: true,
      precoFixoQdc: true,
    },
  });
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };

  const tipologias = await prisma.tipologia.findMany({
    where: { empreendimentoId: orcamento.empreendimentoId },
    select: { id: true, nome: true, quantidadeUnidades: true },
  });

  const kitsContratados = [
    empreendimento.kitEletrico && "ELETRICO",
    empreendimento.kitHidraulico && "HIDRAULICO",
    empreendimento.kitQdc && "QDC",
  ].filter(Boolean) as KitContratado[];

  let novosItens: ReturnType<typeof calcularItensServico>;

  if (ativar) {
    const totalUnidades = tipologias.reduce((s, t) => s + t.quantidadeUnidades, 0);
    const valoresPorKit: Record<string, number | null> = {
      ELETRICO: empreendimento.precoFixoEletrico != null ? Number(empreendimento.precoFixoEletrico) : null,
      HIDRAULICO: empreendimento.precoFixoHidraulico != null ? Number(empreendimento.precoFixoHidraulico) : null,
      QDC: empreendimento.precoFixoQdc != null ? Number(empreendimento.precoFixoQdc) : null,
    };
    novosItens = kitsContratados
      .filter((kit) => valoresPorKit[kit] != null)
      .map((kit) => {
        const precoUnitario = valoresPorKit[kit]!;
        return {
          tipologiaId: "TODAS",
          tipologiaNome: "Todas as tipologias (empreendimento inteiro)",
          kit,
          quantidade: totalUnidades,
          precoBase: precoUnitario,
          multiplicador: 1,
          precoUnitario,
          total: parseFloat((precoUnitario * totalUnidades).toFixed(2)),
          semPreco: false,
          simulado: false,
        };
      });
  } else {
    // Desligar volta pro critério ÁREA (simplificação segura — se
    // precisar de Pontos de Teto específico, gera um novo orçamento).
    const multiplicadorTier = await repo.buscarMultiplicadorTier(orcamento.tier);
    const tabelaPreco = await repo.buscarTabelaPreco();

    const quantidadesPorTipologia = new Map(tipologias.map((t) => [t.id, t.quantidadeUnidades]));
    const kitsProntosPorTipologia = new Map(tipologias.map((t) => [t.id, kitsContratados as KitContratado[]]));

    novosItens = calcularItensServico({
      tipologias: tipologias.map((t) => ({ ...t, empreendimentoId: orcamento.empreendimentoId }) as never),
      quantidadesPorTipologia,
      kitsContratados: kitsContratados as KitContratado[],
      kitsProntosPorTipologia,
      tabelaPreco,
      multiplicadorTier,
      criterio: "AREA",
    });
  }

  const totalServicosHgi = novosItens.filter((i) => !i.simulado).reduce((s, i) => s + i.total, 0);

  await prisma.orcamento.update({
    where: { id: orcamentoId },
    data: {
      criterioLivre: ativar,
      totalServicosHgi,
    },
  });
  await prisma.itemServicoOrcamento.deleteMany({ where: { orcamentoId } });
  await prisma.itemServicoOrcamento.createMany({
    data: novosItens.map((i) => ({
      orcamentoId,
      tipologiaId: i.tipologiaId,
      tipologiaNome: i.tipologiaNome,
      kit: i.kit,
      quantidade: i.quantidade,
      precoBase: i.precoBase,
      multiplicador: i.multiplicador,
      precoUnitario: i.precoUnitario,
      total: i.total,
      pontos: null,
    })),
  });

  revalidatePath(`/empreendimentos/${orcamento.empreendimentoId}/orcamento`);
  return { ok: true };
}

export async function criarOrcamento(
  empreendimentoId: string,
  input: {
    tier?: number;
    observacoes?: string;
  }
): Promise<{ erro: string } | { id: string }> {
  const session = await getServerSession(authOptions);
  const criadoPorId = session?.user?.id ?? null;

  const revisoesExistentes = await repo.listarPorEmpreendimento(empreendimentoId);
  const ultima = revisoesExistentes[0];
  if (ultima?.status === "ORCAMENTO_APROVADO") {
    return {
      erro: "O orçamento atual já foi aprovado pela gestão. Somente um Diretor ou Coordenador pode reabri-lo antes de uma nova revisão ser criada.",
    };
  }

  const empreendimento = await empRepo.findByIdIncluindoExcluidos(empreendimentoId);
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };
  const guardaArquivado = verificarEmpreendimentoNaoArquivado(empreendimento);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  // Tier: usa o do input (se usuário editou) ou o do empreendimento, fallback 2
  const tier = input.tier ?? empreendimento.tier ?? 2;

  // Kits contratados no cadastro do empreendimento — só define quais
  // levantamentos FAZEM SENTIDO checar, não quais entram automaticamente
  // no orçamento (isso depende de estar validado, ver abaixo).
  const kitsContratados: KitContratado[] = [];
  if (empreendimento.kitEletrico) kitsContratados.push("ELETRICO");
  if (empreendimento.kitHidraulico) kitsContratados.push("HIDRAULICO");
  if (empreendimento.kitQdc) kitsContratados.push("QDC");

  if (kitsContratados.length === 0) {
    return { erro: "O empreendimento não possui kits contratados configurados." };
  }

  // Tipologias — já carregam quantidadeUnidades diretamente (o número que
  // você digita no cadastro do empreendimento, validado pra bater com o
  // total de torres × pavimentos × unidades). Não depende de vincular
  // unidade por unidade a uma tipologia — isso nunca existiu no sistema e
  // não é necessário pro seu processo.
  const tipologias = await estruturaRepo.buscarTipologias(empreendimentoId);

  if (tipologias.length === 0) {
    return { erro: "O empreendimento não possui tipologias cadastradas." };
  }

  const quantidadesPorTipologia = new Map<string, number>();
  for (const tipologia of tipologias) {
    quantidadesPorTipologia.set(tipologia.id, tipologia.quantidadeUnidades);
  }

  // Kit contratado ≠ kit pronto para cobrar. Só entra no orçamento o kit
  // que tem levantamento técnico VALIDADO para aquela tipologia específica
  // — evita cobrar por um serviço cujo escopo real ainda não foi medido.
  const levantamentosHidraulicos = kitsContratados.includes("HIDRAULICO")
    ? await levantamentoHidraulicoRepo.buscarTodosPorEmpreendimento(empreendimentoId)
    : [];

  const kitsProntosPorTipologia = new Map<string, KitContratado[]>();
  const pontosTetoPorTipologia = new Map<string, number>();
  for (const tipologia of tipologias) {
    const prontos: KitContratado[] = [];

    if (kitsContratados.includes("ELETRICO")) {
      const lev = await levantamentoRepo.buscarPorTipologia(empreendimentoId, tipologia.id);
      if (lev?.status === "VALIDADO") prontos.push("ELETRICO");

      // Conta pontos de teto (código "L" + número) distintos nos trechos —
      // só usado se o critério global de precificação for PONTOS_TETO.
      if (lev) {
        const pontos = new Set<string>();
        for (const peca of lev.pecas) {
          for (const parte of peca.trecho.split(/[-+]/)) {
            const p = parte.trim();
            if (/^L\d+$/i.test(p)) pontos.add(p.toUpperCase());
          }
        }
        pontosTetoPorTipologia.set(tipologia.id, pontos.size);
      }
    }

    if (kitsContratados.includes("HIDRAULICO")) {
      const temValidado = levantamentosHidraulicos.some(
        (l) => l.tipologiaId === tipologia.id && l.status === "VALIDADO"
      );
      if (temValidado) prontos.push("HIDRAULICO");
    }

    // QDC: sem módulo de levantamento próprio ainda — nunca entra
    // automaticamente até esse módulo existir (evita dado inventado).

    kitsProntosPorTipologia.set(tipologia.id, prontos);
  }

  // Tabela de preços, multiplicador e critério de precificação ativo —
  // prioriza o critério DESTE empreendimento (escolhido na tela de
  // edição); se ele não tiver escolhido nada, cai no padrão global.
  const [tabelaPreco, multiplicadorTier, configuracao, empreendimentoCriterio] = await Promise.all([
    repo.buscarTabelaPreco(),
    repo.buscarMultiplicadorTier(tier),
    prisma.configuracaoSistema.findUnique({ where: { id: "default" } }),
    prisma.empreendimento.findUnique({
      where: { id: empreendimentoId },
      select: {
        criterioPrecificacao: true,
        precoFixoEletrico: true,
        precoFixoHidraulico: true,
        precoFixoQdc: true,
      },
    }),
  ]);
  const criterio = empreendimentoCriterio?.criterioPrecificacao ?? configuracao?.criterioPrecificacao ?? "AREA";
  const formulaPontos = {
    valorMinimo: Number(configuracao?.kitValorMinimo ?? 550),
    pontosInclusos: configuracao?.kitPontosInclusos ?? 6,
    valorPorPontoExtra: Number(configuracao?.kitValorPorPontoExtra ?? 70),
  };

  // No critério PONTOS_TETO, o preço é ÚNICO para o empreendimento inteiro
  // — não varia por tipologia (decisão de negócio confirmada com o
  // Henrique em 24/07/2026, Tarefa 2.1.3). Substitui o mapa por
  // tipologia pela mesma média em todas as entradas, mantendo o resto do
  // cálculo (calcularItensServico) sem precisar saber dessa regra.
  if (criterio === "PONTOS_TETO") {
    const mediaPontos = calcularPontosMedioPorApartamento(
      tipologias.map((t) => ({
        tipologiaId: t.id,
        pontos: pontosTetoPorTipologia.get(t.id) ?? 0,
        quantidadeUnidades: quantidadesPorTipologia.get(t.id) ?? 0,
      }))
    );
    for (const tipologia of tipologias) {
      pontosTetoPorTipologia.set(tipologia.id, mediaPontos);
    }
  }

  // Preços travados na mão pra Tipologia+Kit específicos — cada
  // apartamento pode ter seu próprio valor, sobrescrevendo a regra de
  // área/pontos SÓ pra aquela combinação. Não se aplica no critério
  // LIVRE (que já ignora tudo isso por definição).
  const precosFixosRaw =
    criterio === "LIVRE"
      ? []
      : await prisma.precoFixoTipologia.findMany({
          where: { tipologiaId: { in: tipologias.map((t) => t.id) } },
          select: { tipologiaId: true, kit: true, valorUnitario: true },
        });
  const precosFixos = new Map(precosFixosRaw.map((p) => [`${p.tipologiaId}:${p.kit}`, Number(p.valorUnitario)]));

  let itensServico: ReturnType<typeof calcularItensServico>;

  if (criterio === "LIVRE") {
    // Critério "Livre" (pedido pelo Henrique em 11/08/2026): valor
    // direto por kit, multiplicado pela quantidade TOTAL de unidades
    // do empreendimento inteiro — sem tier, sem pontos, sem faixa de
    // área, sem depender de levantamento validado. Gera 1 item por
    // kit contratado (não mais por tipologia).
    const totalUnidades = Array.from(quantidadesPorTipologia.values()).reduce((s, q) => s + q, 0);
    const valoresPorKit: Record<string, number | null> = {
      ELETRICO: empreendimentoCriterio?.precoFixoEletrico != null ? Number(empreendimentoCriterio.precoFixoEletrico) : null,
      HIDRAULICO: empreendimentoCriterio?.precoFixoHidraulico != null ? Number(empreendimentoCriterio.precoFixoHidraulico) : null,
      QDC: empreendimentoCriterio?.precoFixoQdc != null ? Number(empreendimentoCriterio.precoFixoQdc) : null,
    };
    itensServico = kitsContratados
      .filter((kit) => valoresPorKit[kit] != null)
      .map((kit) => {
        const precoUnitario = valoresPorKit[kit]!;
        return {
          tipologiaId: "TODAS",
          tipologiaNome: "Todas as tipologias (empreendimento inteiro)",
          kit,
          quantidade: totalUnidades,
          precoBase: precoUnitario,
          multiplicador: 1,
          precoUnitario,
          total: parseFloat((precoUnitario * totalUnidades).toFixed(2)),
          semPreco: false,
          simulado: false,
          precoFixado: true,
        };
      });
  } else {
    itensServico = calcularItensServico({
      tipologias,
      quantidadesPorTipologia,
      kitsContratados,
      kitsProntosPorTipologia,
      tabelaPreco,
      multiplicadorTier,
      criterio,
      pontosTetoPorTipologia,
      formulaPontos,
      precosFixos,
    });
  }


  if (itensServico.length === 0) {
    return {
      erro: "Nenhum kit contratado tem levantamento validado ainda. Valide o levantamento elétrico e/ou hidráulico de pelo menos uma tipologia antes de criar o orçamento.",
    };
  }

  // Revisão sequencial
  const revisao = await repo.proximaRevisao(empreendimentoId);

  // Bloco 2 — Materiais: só entra o material de tipologias com
  // Levantamento de Materiais VALIDADO (mesma regra do Bloco 1: sem
  // validação, sem número confiável pra cobrar).
  const levantamentosMateriais = empreendimento.kitEletrico
    ? await levantamentoMateriaisRepo.buscarTodosPorEmpreendimento(empreendimentoId)
    : [];

  const itensMaterial = levantamentosMateriais
    .filter((l) => l.status === "VALIDADO")
    .flatMap((l) =>
      l.itens.map((item) => ({
        materialEletricoId: item.materialCatalogoId ?? null,
        tipologiaNome: l.tipologiaNome ?? null,
        descricao: item.descricao,
        categoria: item.fabricante,
        unidade: item.unidade,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        total: parseFloat((item.precoUnitario * item.quantidade).toFixed(2)),
      }))
    );

  const orcamento = await repo.criar({
    empreendimentoId,
    revisao,
    tier,
    observacoes: input.observacoes ?? null,
    criadoPorId,
    itensServico,
    itensMaterial,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { id: orcamento.id };
}

export async function atualizarStatusOrcamento(
  id: string,
  empreendimentoId: string,
  status: StatusOrcamento,
  motivoDevolucao?: string
): Promise<{ erro: string } | { ok: true }> {
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  // Transições que só um Diretor/Coordenador pode fazer: aprovar, devolver
  // e reabrir um orçamento já aprovado.
  const orcamento = await repo.buscarPorId(id);
  const transicaoSensivel =
    status === "ORCAMENTO_APROVADO" ||
    status === "ORCAMENTO_DEVOLVIDO" ||
    orcamento?.status === "ORCAMENTO_APROVADO";

  if (transicaoSensivel) {
    try {
      await exigirPermissao(PERMISSOES.EMPREENDIMENTO_APROVAR_PROPOSTA);
    } catch (e) {
      return { erro: e instanceof Error ? e.message : "Não autorizado." };
    }
  }

  // Preciso do usuário logado só pra registrar quem aprovou — busca
  // direto da sessão sem exigir permissão extra (o que já rodou acima
  // cobre a checagem de quem pode fazer essa transição).
  const sessaoAtual = await getServerSession(authOptions);
  const usuarioId = sessaoAtual?.user?.id ?? "";

  // BUG REAL (achado depois de uma sessão de reforma da Orçamentação
  // quebrar o fluxo de aprovação): esse botão genérico só mudava `status`,
  // sem saber que existe um campo `statusAprovacao` separado (usado pela
  // fila "Aguardando minha aprovação"). Os dois campos ficavam
  // dessincronizados — orçamento aparecia "Enviado" na tela, mas nunca
  // aparecia em nenhuma fila de aprovação de verdade. Agora rotea pros
  // métodos que atualizam os dois campos juntos, sempre que a transição
  // for uma dessas 3 específicas.
  if (status === "ENVIADO_APROVACAO_GESTOR") {
    await repo.enviarParaAprovacao(id);
  } else if (status === "ORCAMENTO_APROVADO") {
    await repo.aprovarOrcamento(id, usuarioId);
    // Ajustado em 08/08/2026 (Negociação v2): a aprovação SOZINHA já
    // empurra o empreendimento pra Negociação — não espera mais a
    // geração da Proposta como gate. "Gerar Proposta" continua
    // disponível, só que agora é uma ação de dentro da Negociação, não
    // um pré-requisito pra chegar lá. Atualiza direto (sem passar pelo
    // gate de verificarGateNegociacao, que ainda exige propostaGeradaEm
    // — esse gate continua valendo pra quem tenta avançar manualmente,
    // só não trava mais esse fluxo automático).
    const empreendimentoAtual = await prisma.empreendimento.findUnique({
      where: { id: empreendimentoId },
      select: { status: true },
    });
    if (empreendimentoAtual && empreendimentoAtual.status === "ORCAMENTACAO") {
      await prisma.empreendimento.update({
        where: { id: empreendimentoId },
        data: { status: "NEGOCIACAO" },
      });
    }
  } else if (status === "ORCAMENTO_DEVOLVIDO") {
    await repo.devolverOrcamento(id, motivoDevolucao?.trim() || "Devolvido sem motivo específico informado.");
  } else {
    await repo.atualizarStatus(id, status);
  }

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  revalidatePath(`/empreendimentos/${empreendimentoId}/negociacao`);
  revalidatePath("/orcamentacao");
  revalidatePath("/negociacao");
  return { ok: true };
}

export async function atualizarObservacoes(
  id: string,
  empreendimentoId: string,
  observacoes: string
): Promise<{ erro?: string } | void> {
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  await repo.atualizarObservacoes(id, observacoes);
  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
}

export async function deletarOrcamento(
  id: string,
  empreendimentoId: string
): Promise<{ erro: string } | undefined> {
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  const orc = await repo.buscarPorId(id);
  if (!orc) return { erro: "Orçamento não encontrado." };
  if (orc.status !== "EM_LEVANTAMENTO") {
    return { erro: "Só é possível excluir orçamentos em Em levantamento." };
  }
  await repo.deletar(id);
  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
}

/**
 * Campos de trava da proposta (data de geração, documento, decisão do
 * cliente) — extraído da página em 2.2.1 (item A4). Mantém o try/catch
 * defensivo original (proteção contra o `db push` ainda não ter rodado
 * nesta VM, já que esses campos foram adicionados depois).
 */
export async function buscarInfoPropostaOrcamento(orcamentoId: string): Promise<{
  propostaGeradaEm: string | null;
  documentoId: string | null;
  decisaoCliente: "PENDENTE" | "ACEITA" | "RECUSADA" | null;
}> {
  try {
    const raw = await prisma.orcamento.findUnique({
      where: { id: orcamentoId },
      select: { propostaGeradaEm: true, propostaDocumentoId: true, decisaoCliente: true },
    });
    if (!raw) return { propostaGeradaEm: null, documentoId: null, decisaoCliente: null };
    return {
      propostaGeradaEm: raw.propostaGeradaEm ? raw.propostaGeradaEm.toLocaleString("pt-BR") : null,
      documentoId: raw.propostaDocumentoId,
      decisaoCliente: (raw.decisaoCliente as "PENDENTE" | "ACEITA" | "RECUSADA" | null) ?? "PENDENTE",
    };
  } catch (e) {
    console.error("[buscarInfoPropostaOrcamento] erro ao carregar campos de proposta:", e);
    return { propostaGeradaEm: null, documentoId: null, decisaoCliente: null };
  }
}

interface CotacaoResumo {
  id: string;
  numero: string;
  status: string;
  fornecedorNome: string;
  totalGeral: number;
  totalItens: number;
  atualizadoEm: Date;
}

/**
 * Lista as cotações de um orçamento — extraído da página em 2.2.1 (item
 * A4). Mantém o try/catch defensivo original (proteção contra a tabela
 * ainda não existir em ambientes que não rodaram a migration).
 */
export async function listarCotacoesDoOrcamento(
  orcamentoId: string
): Promise<{ cotacoes: CotacaoResumo[]; erro: string | null }> {
  try {
    const raw = await prisma.cotacao.findMany({
      where: { orcamentoId },
      include: {
        fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      cotacoes: raw.map((c) => ({
        id: c.id,
        numero: c.numero,
        status: c.status,
        fornecedorNome: c.fornecedor.nomeFantasia ?? c.fornecedor.razaoSocial,
        totalGeral: Number(c.totalGeral ?? 0),
        totalItens: c._count.itens,
        atualizadoEm: c.updatedAt,
      })),
      erro: null,
    };
  } catch (e) {
    console.error("[listarCotacoesDoOrcamento] erro ao carregar cotações:", e);
    return {
      cotacoes: [],
      erro: "Módulo de Cotações indisponível — rode `docker compose run --rm migrate npx prisma db push` para criar as tabelas.",
    };
  }
}

/**
 * Fornecedores ativos (id + nome de exibição) — extraído da página em
 * 2.2.1 (item A4).
 */
export async function listarFornecedoresAtivosResumo() {
  const fornecedores = await prisma.fornecedor.findMany({
    where: { ativo: true },
    select: { id: true, razaoSocial: true, nomeFantasia: true },
    orderBy: { razaoSocial: "asc" },
  });
  return fornecedores.map((f) => ({ id: f.id, nome: f.nomeFantasia ?? f.razaoSocial }));
}
