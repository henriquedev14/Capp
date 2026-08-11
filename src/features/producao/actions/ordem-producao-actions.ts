"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarPedidosLiberadosParaProducao } from "@/features/producao/lib/pedidos-producao";

function revalidar() {
  revalidatePath("/producao/terminal");
  revalidatePath("/producao");
}

async function proximoNumeroOp(): Promise<string> {
  const ultima = await prisma.ordemProducao.findFirst({ orderBy: { numero: "desc" }, select: { numero: true } });
  const proximo = ultima ? parseInt(ultima.numero.slice(3), 10) + 1 : 1;
  return `OP-${String(proximo).padStart(6, "0")}`;
}

/**
 * Garante que existe uma OrdemProducao pra cada pedido liberado
 * relevante pra essa bancada — cria as que faltarem, nunca duplica.
 * É assim que a OP "nasce sozinha": ninguém precisa criar manualmente,
 * ela aparece quando a Tipologia libera material (mesmo sinal que já
 * era usado por listarPedidosLiberadosParaProducao). Decisão tomada
 * com o Henrique em 10/08/2026.
 */
export async function garantirOrdensProducao(bancadaId: string) {
  const pedidos = await listarPedidosLiberadosParaProducao();
  const pedidosProntos = pedidos.filter((p) => p.situacaoMateriais === "OK");

  for (const pedido of pedidosProntos) {
    const jaExiste = await prisma.ordemProducao.findFirst({
      where: { tipologiaId: pedido.tipologiaId, bancadaId, status: { not: "CONCLUIDA" } },
    });
    if (jaExiste) continue;

    const numero = await proximoNumeroOp();
    const prioridade: "ALTA" | "MEDIA" | "BAIXA" =
      !pedido.dataProximaRemessa
        ? "BAIXA"
        : new Date(pedido.dataProximaRemessa).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
          ? "ALTA"
          : "MEDIA";

    await prisma.ordemProducao.create({
      data: {
        numero,
        tipologiaId: pedido.tipologiaId,
        bancadaId,
        quantidadeAlvo: pedido.quantidadeUnidades,
        prazo: pedido.dataProximaRemessa ? new Date(pedido.dataProximaRemessa) : null,
        prioridade,
      },
    });
  }
}

export interface OrdemProducaoView {
  id: string;
  numero: string;
  tipologiaNome: string;
  empreendimentoNome: string;
  quantidadeAlvo: number;
  quantidadeAprovada: number;
  quantidadeRetrabalho: number;
  quantidadePerda: number;
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  prazo: string | null;
  status: "PENDENTE" | "EM_ANDAMENTO" | "PAUSADA" | "CONCLUIDA";
  tempoTotalSegundos: number;
  operadorAtualNome: string | null;
  metaPorHora: number;
}

export async function listarOrdensDaBancada(bancadaId: string): Promise<OrdemProducaoView[]> {
  await garantirOrdensProducao(bancadaId);

  const bancada = await prisma.bancada.findUnique({ where: { id: bancadaId } });
  const metaPorHora = bancada ? Number(bancada.uhReferencia) : 0;

  const ordens = await prisma.ordemProducao.findMany({
    where: { bancadaId, status: { not: "CONCLUIDA" } },
    include: {
      tipologia: { select: { nome: true, empreendimento: { select: { nome: true } } } },
      operadorAtual: { select: { nome: true } },
    },
    orderBy: [{ prioridade: "asc" }, { prazo: "asc" }],
  });

  const ORDEM_PRIORIDADE = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
  return ordens
    .map((o) => ({
      id: o.id,
      numero: o.numero,
      tipologiaNome: o.tipologia.nome,
      empreendimentoNome: o.tipologia.empreendimento.nome,
      quantidadeAlvo: o.quantidadeAlvo,
      quantidadeAprovada: o.quantidadeAprovada,
      quantidadeRetrabalho: o.quantidadeRetrabalho,
      quantidadePerda: o.quantidadePerda,
      prioridade: o.prioridade,
      prazo: o.prazo ? o.prazo.toISOString().slice(0, 10) : null,
      status: o.status,
      tempoTotalSegundos: o.tempoTotalSegundos,
      operadorAtualNome: o.operadorAtual?.nome ?? null,
      metaPorHora,
    }))
    .sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade]);
}

export async function iniciarOuRetomarOrdem(
  ordemId: string,
  operadorId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const ordem = await prisma.ordemProducao.findUnique({ where: { id: ordemId } });
  if (!ordem) return { erro: "Ordem não encontrada." };
  if (ordem.status === "CONCLUIDA") return { erro: "Essa OP já foi finalizada." };

  const pausaAberta = await prisma.pausaOrdemProducao.findFirst({
    where: { ordemProducaoId: ordemId, fim: null },
  });
  if (pausaAberta) {
    await prisma.pausaOrdemProducao.update({ where: { id: pausaAberta.id }, data: { fim: new Date() } });
  }

  await prisma.ordemProducao.update({
    where: { id: ordemId },
    data: {
      status: "EM_ANDAMENTO",
      operadorAtualId: operadorId,
      iniciadaEm: ordem.iniciadaEm ?? new Date(),
    },
  });

  revalidar();
  return { ok: true };
}

export async function pausarOrdem(
  ordemId: string,
  motivo: string,
  segundosRodadosNaSessao: number
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (!motivo.trim()) return { erro: "Escolha o motivo da pausa." };

  await prisma.$transaction([
    prisma.ordemProducao.update({
      where: { id: ordemId },
      data: {
        status: "PAUSADA",
        tempoTotalSegundos: { increment: Math.max(0, Math.round(segundosRodadosNaSessao)) },
      },
    }),
    prisma.pausaOrdemProducao.create({
      data: { ordemProducaoId: ordemId, motivo, inicio: new Date() },
    }),
  ]);

  revalidar();
  return { ok: true };
}

export async function incrementarContadorOrdem(
  ordemId: string,
  tipo: "APROVADO" | "RETRABALHO" | "PERDA",
  quantidade: number
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const ordem = await prisma.ordemProducao.findUnique({ where: { id: ordemId } });
  if (!ordem) return { erro: "Ordem não encontrada." };

  if (tipo === "APROVADO") {
    await prisma.ordemProducao.update({
      where: { id: ordemId },
      data: { quantidadeAprovada: Math.max(0, ordem.quantidadeAprovada + quantidade) },
    });
  } else if (tipo === "RETRABALHO") {
    await prisma.ordemProducao.update({
      where: { id: ordemId },
      data: { quantidadeRetrabalho: Math.max(0, ordem.quantidadeRetrabalho + quantidade) },
    });
  } else {
    await prisma.ordemProducao.update({
      where: { id: ordemId },
      data: { quantidadePerda: Math.max(0, ordem.quantidadePerda + quantidade) },
    });
  }

  revalidar();
  return { ok: true };
}

export async function finalizarOrdem(
  ordemId: string,
  segundosRodadosNaSessao: number,
  forcar = false
): Promise<{ ok: true } | { erro: string; incompleta?: boolean }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const ordem = await prisma.ordemProducao.findUnique({ where: { id: ordemId } });
  if (!ordem) return { erro: "Ordem não encontrada." };

  if (ordem.quantidadeAprovada < ordem.quantidadeAlvo && !forcar) {
    return {
      erro: `Só ${ordem.quantidadeAprovada} de ${ordem.quantidadeAlvo} aprovados. Confirma finalizar mesmo assim?`,
      incompleta: true,
    };
  }

  await prisma.ordemProducao.update({
    where: { id: ordemId },
    data: {
      status: "CONCLUIDA",
      finalizadaEm: new Date(),
      tempoTotalSegundos: { increment: Math.max(0, Math.round(segundosRodadosNaSessao)) },
    },
  });

  revalidar();
  return { ok: true };
}
