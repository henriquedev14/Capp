"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

/**
 * Aplica a Tabela de Preços Padrão dos fornecedores selecionados a todos
 * os itens do Bloco 2 (materiais) do orçamento — pra cada material,
 * procura entre os fornecedores selecionados (na ordem em que foram
 * escolhidos = prioridade) e usa o primeiro que tiver aquele material
 * numa tabela ATIVA. Isso SUBSTITUI o preço/marca que estava lá (do
 * catálogo, por padrão) — quem quiser manter o preço de catálogo em
 * algum item específico, não seleciona fornecedor pra ele depois (via
 * ajuste manual).
 */
export async function aplicarTabelaPrecoOrcamento(
  orcamentoId: string,
  empreendimentoId: string,
  fornecedorIds: string[]
): Promise<Resultado & { aplicados?: number; semMatch?: number }> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  const bloqueio = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio.permitido) return { erro: bloqueio.motivo! };

  if (fornecedorIds.length === 0) return { erro: "Selecione ao menos um fornecedor." };

  const tabelasAtivas = await prisma.tabelaPrecoFornecedor.findMany({
    where: { fornecedorId: { in: fornecedorIds }, status: "ATIVA" },
    orderBy: { dataImportacao: "desc" },
    include: { itens: true },
  });

  // Uma oferta por material — respeita a ORDEM de fornecedorIds recebida
  // (é a prioridade escolhida pelo usuário na tela).
  const ofertaPorMaterial = new Map<string, { itemTabelaPrecoId: string; valorUnitario: number; marca: string; fornecedorId: string }>();
  for (const fornecedorId of fornecedorIds) {
    const tabela = tabelasAtivas.find((t) => t.fornecedorId === fornecedorId);
    if (!tabela) continue;
    for (const item of tabela.itens) {
      if (!item.materialEletricoId) continue;
      if (ofertaPorMaterial.has(item.materialEletricoId)) continue;
      ofertaPorMaterial.set(item.materialEletricoId, {
        itemTabelaPrecoId: item.id,
        valorUnitario: Number(item.valorUnitario),
        marca: item.marca,
        fornecedorId,
      });
    }
  }

  const itensOrcamento = await prisma.itemMaterialOrcamento.findMany({
    where: { orcamentoId, materialEletricoId: { not: null } },
  });

  let aplicados = 0;
  for (const item of itensOrcamento) {
    if (!item.materialEletricoId) continue;
    const oferta = ofertaPorMaterial.get(item.materialEletricoId);
    if (!oferta) continue;

    await prisma.itemMaterialOrcamento.update({
      where: { id: item.id },
      data: {
        precoUnitario: oferta.valorUnitario,
        total: Number(item.quantidade) * oferta.valorUnitario,
        fornecedorSelecionadoId: oferta.fornecedorId,
        itemTabelaPrecoId: oferta.itemTabelaPrecoId,
        marca: oferta.marca,
        situacao: "NORMAL",
      },
    });
    aplicados++;
  }

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true, aplicados, semMatch: itensOrcamento.length - aplicados };
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
