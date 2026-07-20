"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { logger } from "@/infra/logger/logger";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

interface OfertaComparacao {
  fornecedorId: string;
  fornecedorNome: string;
  marca: string;
  valorUnitario: number;
  itemTabelaPrecoId: string;
}

interface ItemComparacao {
  itemOrcamentoId: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoAtual: number | null;
  ofertas: OfertaComparacao[];
}

/**
 * Mostra TODAS as ofertas de cada fornecedor selecionado pro mesmo
 * material, lado a lado — não escolhe nada sozinho. O usuário decide por
 * item na tela antes de confirmar (ver `confirmarAplicacaoTabelaPreco`).
 */
export async function compararOfertasTabelaPreco(
  orcamentoId: string,
  fornecedorIds: string[]
): Promise<{ erro: string } | { ok: true; itens: ItemComparacao[]; totalSemOferta: number }> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);

  if (fornecedorIds.length === 0) return { erro: "Selecione ao menos um fornecedor." };

  const tabelasAtivas = await prisma.tabelaPrecoFornecedor.findMany({
    where: { fornecedorId: { in: fornecedorIds }, status: "ATIVA" },
    orderBy: { dataImportacao: "desc" },
    include: { itens: true, fornecedor: { select: { razaoSocial: true, nomeFantasia: true } } },
  });

  // Uma tabela (a mais recente) por fornecedor selecionado.
  const tabelaPorFornecedor = new Map<string, (typeof tabelasAtivas)[number]>();
  for (const fornecedorId of fornecedorIds) {
    const tabela = tabelasAtivas.find((t) => t.fornecedorId === fornecedorId);
    if (tabela) tabelaPorFornecedor.set(fornecedorId, tabela);
  }

  const itensOrcamento = await prisma.itemMaterialOrcamento.findMany({
    where: { orcamentoId, materialEletricoId: { not: null } },
  });

  const itens: ItemComparacao[] = [];
  let totalSemOferta = 0;

  for (const item of itensOrcamento) {
    if (!item.materialEletricoId) continue;

    // Uma oferta por fornecedor selecionado (na ordem escolhida) — só
    // entra na lista se aquele fornecedor tiver esse material.
    const ofertas: OfertaComparacao[] = [];
    for (const fornecedorId of fornecedorIds) {
      const tabela = tabelaPorFornecedor.get(fornecedorId);
      if (!tabela) continue;
      const oferta = tabela.itens.find((i) => i.materialEletricoId === item.materialEletricoId);
      if (!oferta) continue;
      ofertas.push({
        fornecedorId,
        fornecedorNome: tabela.fornecedor.nomeFantasia ?? tabela.fornecedor.razaoSocial,
        marca: oferta.marca,
        valorUnitario: Number(oferta.valorUnitario),
        itemTabelaPrecoId: oferta.id,
      });
    }

    if (ofertas.length === 0) {
      totalSemOferta++;
      continue;
    }

    itens.push({
      itemOrcamentoId: item.id,
      descricao: item.descricao,
      quantidade: Number(item.quantidade),
      unidade: item.unidade,
      precoAtual: item.precoUnitario != null ? Number(item.precoUnitario) : null,
      ofertas,
    });
  }

  return { ok: true, itens, totalSemOferta };
}

/**
 * Aplica as escolhas feitas na tela de comparação — uma por item, cada
 * uma apontando pro `itemTabelaPrecoId` escolhido especificamente (não
 * decide nada automaticamente, só grava o que o usuário já escolheu).
 */
export async function confirmarAplicacaoTabelaPreco(
  empreendimentoId: string,
  escolhas: { itemOrcamentoId: string; fornecedorId: string; itemTabelaPrecoId: string; valorUnitario: number; marca: string }[]
): Promise<Resultado & { aplicados?: number }> {
  const sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  const bloqueio = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio.permitido) return { erro: bloqueio.motivo! };

  for (const escolha of escolhas) {
    const item = await prisma.itemMaterialOrcamento.findUnique({ where: { id: escolha.itemOrcamentoId } });
    if (!item) continue;
    await prisma.itemMaterialOrcamento.update({
      where: { id: escolha.itemOrcamentoId },
      data: {
        precoUnitario: escolha.valorUnitario,
        total: Number(item.quantidade) * escolha.valorUnitario,
        fornecedorSelecionadoId: escolha.fornecedorId,
        itemTabelaPrecoId: escolha.itemTabelaPrecoId,
        marca: escolha.marca,
        situacao: "NORMAL",
      },
    });
  }

  logger.info(
    {
      empreendimentoId,
      usuarioId: sessao.user.id,
      itensAplicados: escolhas.length,
      fornecedoresIds: Array.from(new Set(escolhas.map((e) => e.fornecedorId))),
    },
    "tabela de preços aplicada a itens de orçamento"
  );

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true, aplicados: escolhas.length };
}

/**
 * Ajuste manual de UM item — troca o fornecedor daquele material
 * específico (ou volta pro preço de catálogo se fornecedorId for null).
 */
export async function definirFornecedorItemOrcamento(
  itemId: string,
  empreendimentoId: string,
  fornecedorId: string | null
): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  const bloqueio = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio.permitido) return { erro: bloqueio.motivo! };

  const item = await prisma.itemMaterialOrcamento.findUnique({ where: { id: itemId } });
  if (!item) return { erro: "Item não encontrado." };

  if (!fornecedorId) {
    // Sem trocar preço/marca aqui — só desvincula a rastreabilidade da
    // Tabela de Preços. Ajustar o preço manualmente é feito à parte.
    await prisma.itemMaterialOrcamento.update({
      where: { id: itemId },
      data: { fornecedorSelecionadoId: null, itemTabelaPrecoId: null },
    });
    revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
    return { ok: true };
  }

  if (!item.materialEletricoId) {
    return { erro: "Este item não está vinculado ao catálogo — não dá pra buscar preço de fornecedor pra ele." };
  }

  const tabela = await prisma.tabelaPrecoFornecedor.findFirst({
    where: { fornecedorId, status: "ATIVA" },
    orderBy: { dataImportacao: "desc" },
    include: { itens: { where: { materialEletricoId: item.materialEletricoId } } },
  });
  const oferta = tabela?.itens[0];
  if (!oferta) {
    return { erro: "Este fornecedor não tem esse material numa Tabela de Preços Ativa." };
  }

  await prisma.itemMaterialOrcamento.update({
    where: { id: itemId },
    data: {
      precoUnitario: Number(oferta.valorUnitario),
      total: Number(item.quantidade) * Number(oferta.valorUnitario),
      fornecedorSelecionadoId: fornecedorId,
      itemTabelaPrecoId: oferta.id,
      marca: oferta.marca,
      situacao: "NORMAL",
    },
  });
  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true };
}
