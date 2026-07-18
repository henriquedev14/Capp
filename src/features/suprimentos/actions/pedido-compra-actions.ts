"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

function revalidar() {
  revalidatePath("/suprimentos");
}

async function proximoNumeroPedido(): Promise<string> {
  const ano = new Date().getFullYear();
  const ultimo = await prisma.pedidoCompra.findFirst({
    where: { numero: { startsWith: `PC-${ano}-` } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const ultimoNumero = ultimo ? parseInt(ultimo.numero.split("-")[2] ?? "0", 10) : 0;
  return `PC-${ano}-${String(ultimoNumero + 1).padStart(3, "0")}`;
}

/**
 * Cria um Pedido de Compra a partir de uma Cotação ACEITA — é o elo que
 * faltava entre "fornecedor cotou" e "material foi de fato encomendado".
 * Itens avulsos (sem vínculo de catálogo) são ignorados aqui, mesma
 * limitação já existente no restante do módulo de Suprimentos.
 */
export async function criarPedidoCompra(
  cotacaoId: string,
  dataPrevistaEntrega?: string
): Promise<{ id: string } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const cotacao = await prisma.cotacao.findUnique({
    where: { id: cotacaoId },
    include: {
      itens: true,
      orcamento: { select: { empreendimentoId: true } },
    },
  });
  if (!cotacao) return { erro: "Cotação não encontrada." };
  if (cotacao.status !== "ACEITA") return { erro: "Só é possível gerar Pedido de Compra a partir de uma cotação aceita." };

  const itensComCatalogo = cotacao.itens.filter((i) => i.materialEletricoId);
  if (itensComCatalogo.length === 0) {
    return { erro: "Essa cotação não tem itens com vínculo de catálogo — não dá pra gerar pedido rastreável." };
  }

  const numero = await proximoNumeroPedido();

  const pedido = await prisma.pedidoCompra.create({
    data: {
      numero,
      cotacaoId,
      fornecedorId: cotacao.fornecedorId,
      empreendimentoId: cotacao.orcamento.empreendimentoId,
      dataPrevistaEntrega: dataPrevistaEntrega ? new Date(dataPrevistaEntrega) : null,
      criadoPorId: sessao.user.id,
      itens: {
        create: itensComCatalogo.map((i) => ({
          materialEletricoId: i.materialEletricoId!,
          descricao: i.descricao,
          quantidadePedida: i.quantidade,
          precoUnitario: i.precoUnitario,
        })),
      },
    },
  });

  revalidar();
  return { id: pedido.id };
}

export async function confirmarPedidoCompra(
  pedidoId: string,
  dataPrevistaEntrega: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await prisma.pedidoCompra.update({
    where: { id: pedidoId },
    data: {
      status: "CONFIRMADO",
      dataConfirmadoEm: new Date(),
      dataPrevistaEntrega: new Date(dataPrevistaEntrega),
    },
  });
  revalidar();
  return { ok: true };
}

export async function marcarPedidoEmTransito(pedidoId: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await prisma.pedidoCompra.update({ where: { id: pedidoId }, data: { status: "EM_TRANSITO" } });
  revalidar();
  return { ok: true };
}

export async function cancelarPedidoCompra(pedidoId: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await prisma.pedidoCompra.update({ where: { id: pedidoId }, data: { status: "CANCELADO" } });
  revalidar();
  return { ok: true };
}

/**
 * Recebimento vinculado a um Pedido de Compra — diferente da entrada
 * "solta" que já existia, essa também atualiza quanto do pedido já
 * chegou (compara pedido × recebido), e some pro status automaticamente
 * (parcial/completo). É o que fecha o ciclo "pedido → recebido".
 */
export async function receberItemPedidoCompra(
  pedidoItemId: string,
  quantidadeRecebidaAgora: number,
  observacao?: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (quantidadeRecebidaAgora <= 0) return { erro: "A quantidade precisa ser maior que zero." };

  const item = await prisma.pedidoCompraItem.findUnique({
    where: { id: pedidoItemId },
    include: { pedido: true },
  });
  if (!item) return { erro: "Item de pedido não encontrado." };

  await prisma.$transaction([
    prisma.movimentacaoEstoque.create({
      data: {
        materialEletricoId: item.materialEletricoId,
        empreendimentoId: item.pedido.empreendimentoId,
        tipo: "ENTRADA",
        quantidade: quantidadeRecebidaAgora,
        observacao: observacao ?? `Recebimento do pedido ${item.pedido.numero}`,
        registradoPorUserId: sessao.user.id,
      },
    }),
    prisma.estoqueEmpreendimentoMaterial.upsert({
      where: {
        empreendimentoId_materialEletricoId: {
          empreendimentoId: item.pedido.empreendimentoId,
          materialEletricoId: item.materialEletricoId,
        },
      },
      update: { saldo: { increment: quantidadeRecebidaAgora } },
      create: {
        empreendimentoId: item.pedido.empreendimentoId,
        materialEletricoId: item.materialEletricoId,
        saldo: quantidadeRecebidaAgora,
      },
    }),
    prisma.pedidoCompraItem.update({
      where: { id: pedidoItemId },
      data: { quantidadeRecebida: { increment: quantidadeRecebidaAgora } },
    }),
  ]);

  // Recalcula o status do pedido: completo só quando TODOS os itens
  // bateram a quantidade pedida; parcial se algo já chegou.
  const todosItens = await prisma.pedidoCompraItem.findMany({ where: { pedidoId: item.pedidoId } });
  const todosCompletos = todosItens.every((i) => Number(i.quantidadeRecebida) >= Number(i.quantidadePedida));
  const algumRecebido = todosItens.some((i) => Number(i.quantidadeRecebida) > 0);
  await prisma.pedidoCompra.update({
    where: { id: item.pedidoId },
    data: { status: todosCompletos ? "ENTREGUE_COMPLETO" : algumRecebido ? "ENTREGUE_PARCIAL" : undefined },
  });

  revalidar();
  return { ok: true };
}

/** Lista pedidos de compra de uma obra, ou todos se empreendimentoId não for passado. */
export async function listarPedidosCompra(empreendimentoId?: string) {
  const pedidos = await prisma.pedidoCompra.findMany({
    where: empreendimentoId ? { empreendimentoId } : undefined,
    include: {
      fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
      empreendimento: { select: { nome: true } },
      itens: true,
    },
    orderBy: { dataPedido: "desc" },
  });

  const hoje = new Date();
  return pedidos.map((p) => {
    const totalPedido = p.itens.reduce((s, i) => s + Number(i.quantidadePedida) * Number(i.precoUnitario), 0);
    const percentualRecebido =
      p.itens.length > 0
        ? Math.round(
            (p.itens.reduce((s, i) => s + Math.min(Number(i.quantidadeRecebida), Number(i.quantidadePedida)), 0) /
              p.itens.reduce((s, i) => s + Number(i.quantidadePedida), 0)) *
              100
          )
        : 0;
    const atrasado =
      !!p.dataPrevistaEntrega &&
      p.dataPrevistaEntrega < hoje &&
      p.status !== "ENTREGUE_COMPLETO" &&
      p.status !== "CANCELADO";

    return {
      id: p.id,
      numero: p.numero,
      fornecedorNome: p.fornecedor.nomeFantasia || p.fornecedor.razaoSocial,
      empreendimentoId: p.empreendimentoId,
      empreendimentoNome: p.empreendimento.nome,
      status: p.status,
      dataPedido: p.dataPedido,
      dataPrevistaEntrega: p.dataPrevistaEntrega,
      totalPedido,
      percentualRecebido,
      atrasado,
      itens: p.itens.map((i) => ({
        id: i.id,
        descricao: i.descricao,
        quantidadePedida: Number(i.quantidadePedida),
        quantidadeRecebida: Number(i.quantidadeRecebida),
      })),
    };
  });
}

/** Ranking de fornecedores por desempenho — prazo, quantidade de pedidos, atraso médio. */
export async function calcularRankingFornecedores() {
  const pedidos = await prisma.pedidoCompra.findMany({
    where: { status: { not: "CANCELADO" } },
    include: { fornecedor: { select: { razaoSocial: true, nomeFantasia: true } } },
  });

  const hoje = new Date();
  const mapa = new Map<
    string,
    { nome: string; totalPedidos: number; pedidosAtrasados: number; somaDiasAtraso: number }
  >();

  for (const p of pedidos) {
    const nome = p.fornecedor.nomeFantasia || p.fornecedor.razaoSocial;
    const atual = mapa.get(p.fornecedorId) ?? { nome, totalPedidos: 0, pedidosAtrasados: 0, somaDiasAtraso: 0 };
    atual.totalPedidos++;
    if (p.dataPrevistaEntrega && p.status !== "ENTREGUE_COMPLETO" && p.dataPrevistaEntrega < hoje) {
      atual.pedidosAtrasados++;
      atual.somaDiasAtraso += Math.floor((hoje.getTime() - p.dataPrevistaEntrega.getTime()) / (1000 * 60 * 60 * 24));
    }
    mapa.set(p.fornecedorId, atual);
  }

  return Array.from(mapa.entries())
    .map(([id, v]) => ({
      fornecedorId: id,
      nome: v.nome,
      totalPedidos: v.totalPedidos,
      pedidosAtrasados: v.pedidosAtrasados,
      diasAtrasoMedio: v.pedidosAtrasados > 0 ? Math.round(v.somaDiasAtraso / v.pedidosAtrasados) : 0,
    }))
    .sort((a, b) => b.pedidosAtrasados - a.pedidosAtrasados);
}
