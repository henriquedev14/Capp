"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

function revalidar() {
  revalidatePath("/suprimentos");
  revalidatePath("/producao");
}

/**
 * Depois de QUALQUER entrada de material, checa se alguma tipologia da
 * obra ficou com material completo agora (e ainda não tinha o marco) —
 * grava o momento exato, pra poder medir depois "quanto tempo entre
 * material completo e início de produção" sem depender de ninguém
 * lembrar de apertar um botão "marcar como completo".
 */
async function verificarEMarcarMaterialCompleto(empreendimentoId: string) {
  const tipologias = await prisma.tipologia.findMany({
    where: { empreendimentoId },
    select: { id: true },
  });

  for (const tipologia of tipologias) {
    const jaTemMarco = await prisma.marcoOperacional.findFirst({
      where: { empreendimentoId, tipologiaId: tipologia.id, etapa: "MATERIAL_COMPLETO" },
    });
    if (jaTemMarco) continue;

    const disponibilidade = await verificarDisponibilidadeParaProducao(empreendimentoId, tipologia.id);
    if ("erro" in disponibilidade || !disponibilidade.podeIniciar) continue;

    await prisma.marcoOperacional.create({
      data: { empreendimentoId, tipologiaId: tipologia.id, etapa: "MATERIAL_COMPLETO" },
    });
  }
}

// ---------------------------------------------------------------------------
// Entrada de material — SEMPRE vinculada a uma obra específica. Não existe
// estoque genérico compartilhado: cada material chega já destinado a um
// empreendimento.
// ---------------------------------------------------------------------------

export async function registrarEntradaEstoque(data: {
  empreendimentoId: string;
  materialEletricoId: string;
  quantidade: number;
  observacao?: string;
}): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(data.empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  if (data.quantidade <= 0) return { erro: "A quantidade precisa ser maior que zero." };

  await prisma.$transaction([
    prisma.movimentacaoEstoque.create({
      data: {
        materialEletricoId: data.materialEletricoId,
        empreendimentoId: data.empreendimentoId,
        tipo: "ENTRADA",
        quantidade: data.quantidade,
        observacao: data.observacao ?? null,
        registradoPorUserId: sessao.user.id,
      },
    }),
    prisma.estoqueEmpreendimentoMaterial.upsert({
      where: {
        empreendimentoId_materialEletricoId: {
          empreendimentoId: data.empreendimentoId,
          materialEletricoId: data.materialEletricoId,
        },
      },
      update: { saldo: { increment: data.quantidade } },
      create: {
        empreendimentoId: data.empreendimentoId,
        materialEletricoId: data.materialEletricoId,
        saldo: data.quantidade,
      },
    }),
  ]);
  await verificarEMarcarMaterialCompleto(data.empreendimentoId);
  revalidar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Checagem de disponibilidade — compara o que o Levantamento de Materiais
// (validado) diz que a tipologia precisa contra o saldo DAQUELA OBRA
// especificamente (não um pool compartilhado com outras obras).
// ---------------------------------------------------------------------------

export interface ItemDisponibilidade {
  descricao: string;
  necessario: number;
  emEstoque: number | null; // null = item avulso, sem vínculo de catálogo — não dá pra conferir automaticamente
  suficiente: boolean | null;
  unidade: string;
}

export async function verificarDisponibilidadeParaProducao(
  empreendimentoId: string,
  tipologiaId: string
): Promise<{ podeIniciar: boolean; itens: ItemDisponibilidade[] } | { erro: string }> {
  const levantamento = await prisma.levantamentoMateriais.findFirst({
    where: { tipologiaId },
    include: { itens: true },
  });

  if (!levantamento) {
    return { erro: "Essa tipologia ainda não tem Levantamento de Materiais." };
  }
  if (levantamento.status !== "VALIDADO") {
    return { erro: "O Levantamento de Materiais dessa tipologia ainda não foi validado." };
  }

  // Busca o saldo dessa OBRA especificamente pra cada material com
  // vínculo de catálogo — não olha saldo de nenhuma outra obra.
  const materialIds = levantamento.itens
    .map((i) => i.materialEletricoId)
    .filter((id): id is string => !!id);
  const saldos = await prisma.estoqueEmpreendimentoMaterial.findMany({
    where: { empreendimentoId, materialEletricoId: { in: materialIds } },
  });
  const saldoPorMaterial = new Map(saldos.map((s) => [s.materialEletricoId, Number(s.saldo)]));

  const itens: ItemDisponibilidade[] = levantamento.itens.map((item) => {
    const emEstoque = item.materialEletricoId ? (saldoPorMaterial.get(item.materialEletricoId) ?? 0) : null;
    const necessario = Number(item.quantidade);
    return {
      descricao: item.descricao,
      necessario,
      emEstoque,
      suficiente: emEstoque === null ? null : emEstoque >= necessario,
      unidade: item.unidade,
    };
  });

  const podeIniciar = itens.every((i) => i.suficiente !== false);

  return { podeIniciar, itens };
}

// ---------------------------------------------------------------------------
// Iniciar produção — só executa a baixa (nessa obra) se TODOS os itens
// conferíveis tiverem saldo suficiente NAQUELA OBRA. Tudo numa transação:
// ou baixa tudo, ou nada.
// ---------------------------------------------------------------------------

export async function iniciarProducaoTipologia(
  tipologiaId: string,
  empreendimentoId: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.SUPRIMENTOS_LIBERAR_PRODUCAO);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  const disponibilidade = await verificarDisponibilidadeParaProducao(empreendimentoId, tipologiaId);
  if ("erro" in disponibilidade) return disponibilidade;
  if (!disponibilidade.podeIniciar) {
    const faltando = disponibilidade.itens.filter((i) => i.suficiente === false);
    return {
      erro: `Falta material pra iniciar: ${faltando.map((i) => `${i.descricao} (precisa ${i.necessario}${i.unidade}, tem ${i.emEstoque}${i.unidade})`).join("; ")}`,
    };
  }

  const levantamento = await prisma.levantamentoMateriais.findFirst({
    where: { tipologiaId },
    include: { itens: true },
  });
  if (!levantamento) return { erro: "Levantamento não encontrado." };

  const operacoes = levantamento.itens
    .filter((item) => item.materialEletricoId)
    .flatMap((item) => [
      prisma.movimentacaoEstoque.create({
        data: {
          materialEletricoId: item.materialEletricoId!,
          empreendimentoId,
          tipologiaId,
          tipo: "SAIDA_PRODUCAO",
          quantidade: -Number(item.quantidade),
          registradoPorUserId: sessao.user.id,
        },
      }),
      prisma.estoqueEmpreendimentoMaterial.update({
        where: {
          empreendimentoId_materialEletricoId: {
            empreendimentoId,
            materialEletricoId: item.materialEletricoId!,
          },
        },
        data: { saldo: { decrement: Number(item.quantidade) } },
      }),
    ]);

  await prisma.$transaction(operacoes);
  await prisma.marcoOperacional.create({
    data: { empreendimentoId, tipologiaId, etapa: "PRODUCAO_INICIADA" },
  });
  revalidar();
  return { ok: true };
}

/** Saldo de estoque de uma obra específica — pra tela de Suprimentos. */
export async function listarSaldoEstoqueDaObra(empreendimentoId: string) {
  const registros = await prisma.estoqueEmpreendimentoMaterial.findMany({
    where: { empreendimentoId },
    include: { materialEletrico: { select: { nome: true, unidade: true, categoria: true } } },
    orderBy: { materialEletrico: { nome: "asc" } },
  });
  return registros.map((r) => ({
    materialEletricoId: r.materialEletricoId,
    nome: r.materialEletrico.nome,
    categoria: r.materialEletrico.categoria,
    unidade: r.materialEletrico.unidade,
    saldo: Number(r.saldo),
  }));
}

// ---------------------------------------------------------------------------
// Importação de nota fiscal (PDF) — sugestão de material por descrição e
// confirmação em lote dos itens revisados pela pessoa.
// ---------------------------------------------------------------------------

function normalizarTexto(v: string): string {
  return v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sugere um material do catálogo pra uma descrição extraída da nota —
 * casamento simples por sobreposição de palavras (sem IA). Só uma
 * sugestão inicial pra revisão humana confirmar ou trocar, nunca aplica
 * sozinho.
 */
export async function sugerirMaterialPorDescricao(
  descricao: string
): Promise<{ id: string; nome: string } | null> {
  const materiais = await prisma.materialEletrico.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
  });

  const palavrasDescricao = new Set(normalizarTexto(descricao).split(" ").filter((p) => p.length > 2));
  if (palavrasDescricao.size === 0) return null;

  let melhor: { id: string; nome: string; pontuacao: number } | null = null;
  for (const m of materiais) {
    const palavrasMaterial = normalizarTexto(m.nome).split(" ").filter((p) => p.length > 2);
    const pontuacao = palavrasMaterial.filter((p) => palavrasDescricao.has(p)).length;
    if (pontuacao > 0 && (!melhor || pontuacao > melhor.pontuacao)) {
      melhor = { id: m.id, nome: m.nome, pontuacao };
    }
  }
  return melhor ? { id: melhor.id, nome: melhor.nome } : null;
}

/**
 * Confirma em lote os itens revisados da nota — cada um vira uma entrada
 * de estoque de verdade, só pros que a pessoa marcou o checkbox.
 */
export async function confirmarEntradasDaNota(
  empreendimentoId: string,
  itens: { materialEletricoId: string; quantidade: number }[],
  observacao?: string
): Promise<{ ok: true; quantidade: number } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  if (itens.length === 0) return { erro: "Nenhum item selecionado." };

  const operacoes = itens.flatMap((item) => [
    prisma.movimentacaoEstoque.create({
      data: {
        materialEletricoId: item.materialEletricoId,
        empreendimentoId,
        tipo: "ENTRADA" as const,
        quantidade: item.quantidade,
        observacao: observacao ?? "Importado de nota fiscal (PDF)",
        registradoPorUserId: sessao.user.id,
      },
    }),
    prisma.estoqueEmpreendimentoMaterial.upsert({
      where: {
        empreendimentoId_materialEletricoId: { empreendimentoId, materialEletricoId: item.materialEletricoId },
      },
      update: { saldo: { increment: item.quantidade } },
      create: { empreendimentoId, materialEletricoId: item.materialEletricoId, saldo: item.quantidade },
    }),
  ]);

  await prisma.$transaction(operacoes);
  await verificarEMarcarMaterialCompleto(empreendimentoId);
  revalidar();
  return { ok: true, quantidade: itens.length };
}

// ---------------------------------------------------------------------------
// % de material recebido — compara o total já recebido (soma de ENTRADA)
// contra o total necessário (soma de todos os Levantamentos de Materiais
// validados de todas as tipologias dessa obra). Só considera itens com
// vínculo de catálogo (avulsos não têm como comparar contra recebimento).
// ---------------------------------------------------------------------------

export interface PercentualRecebido {
  percentual: number; // 0 a 100 (pode passar de 100 se recebeu mais que o necessário)
  valorNecessarioTotal: number; // em "unidades genéricas" só de contagem de itens, não R$
  itensComPendencia: number; // quantos materiais distintos ainda não bateram 100%
}

export async function calcularPercentualRecebidoDaObra(
  empreendimentoId: string
): Promise<PercentualRecebido> {
  const [necessarios, recebidos] = await Promise.all([
    prisma.itemLevantamentoMaterial.groupBy({
      by: ["materialEletricoId"],
      where: {
        materialEletricoId: { not: null },
        levantamento: { empreendimentoId, status: "VALIDADO" },
      },
      _sum: { quantidade: true },
    }),
    prisma.movimentacaoEstoque.groupBy({
      by: ["materialEletricoId"],
      where: { empreendimentoId, tipo: "ENTRADA" },
      _sum: { quantidade: true },
    }),
  ]);

  const recebidoPorMaterial = new Map(recebidos.map((r) => [r.materialEletricoId, Number(r._sum.quantidade ?? 0)]));

  let somaNecessaria = 0;
  let somaRecebidaLimitada = 0; // recebido, capado no necessário — pra não deixar 1 item "sobrando" mascarar outro faltando
  let itensComPendencia = 0;

  for (const item of necessarios) {
    if (!item.materialEletricoId) continue;
    const necessario = Number(item._sum.quantidade ?? 0);
    if (necessario <= 0) continue;
    const recebido = recebidoPorMaterial.get(item.materialEletricoId) ?? 0;
    somaNecessaria += necessario;
    somaRecebidaLimitada += Math.min(recebido, necessario);
    if (recebido < necessario) itensComPendencia++;
  }

  const percentual = somaNecessaria > 0 ? Math.round((somaRecebidaLimitada / somaNecessaria) * 1000) / 10 : 0;

  return { percentual, valorNecessarioTotal: somaNecessaria, itensComPendencia };
}

// ---------------------------------------------------------------------------
// Dashboard de Suprimentos — visão consolidada de todas as obras ativas.
// ---------------------------------------------------------------------------

export interface ObraSuprimentos {
  empreendimentoId: string;
  empreendimentoNome: string;
  status: string;
  percentualRecebido: number;
  itensComPendencia: number;
}

export async function listarObrasParaDashboardSuprimentos(): Promise<ObraSuprimentos[]> {
  const empreendimentos = await prisma.empreendimento.findMany({
    where: { status: { in: ["CONTRATADO", "SUPRIMENTOS", "PRODUCAO"] }, excluidoEm: null },
    select: { id: true, nome: true, status: true },
    orderBy: { nome: "asc" },
  });

  const resultado: ObraSuprimentos[] = [];
  for (const emp of empreendimentos) {
    const pct = await calcularPercentualRecebidoDaObra(emp.id);
    resultado.push({
      empreendimentoId: emp.id,
      empreendimentoNome: emp.nome,
      status: emp.status,
      percentualRecebido: pct.percentual,
      itensComPendencia: pct.itensComPendencia,
    });
  }

  // Menor % primeiro — é o que mais precisa de atenção (comprar/receber
  // material urgente), não faz sentido ordenar por nome numa tela de
  // gestão de suprimentos.
  return resultado.sort((a, b) => a.percentualRecebido - b.percentualRecebido);
}

/** Últimas entradas de material registradas — pra ver o que chegou recentemente. */
export async function listarUltimasEntradas(limite = 15) {
  const registros = await prisma.movimentacaoEstoque.findMany({
    where: { tipo: "ENTRADA" },
    include: {
      materialEletrico: { select: { nome: true, unidade: true } },
      empreendimento: { select: { nome: true } },
      registradoPor: { select: { nome: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limite,
  });
  return registros.map((r) => ({
    id: r.id,
    materialNome: r.materialEletrico.nome,
    unidade: r.materialEletrico.unidade,
    quantidade: Number(r.quantidade),
    empreendimentoNome: r.empreendimento.nome,
    registradoPorNome: r.registradoPor.nome,
    createdAt: r.createdAt,
  }));
}
