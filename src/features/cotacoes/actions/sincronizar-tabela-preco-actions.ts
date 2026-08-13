"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { sincronizarProdutoFornecedor } from "@/features/fornecedores/lib/sincronizar-produto-fornecedor";

export interface PreviewSincronizacao {
  fornecedorNome: string;
  totalItensComPreco: number;
  totalItensSemMaterialVinculado: number;
  tabelaDestino: string;
}

/**
 * Monta o texto de aviso ANTES de sincronizar — pra mostrar na
 * confirmação o que exatamente vai mudar. Pedido pelo Henrique em
 * 12/08/2026: precisa avisar e pedir confirmação, não fazer
 * silenciosamente.
 */
export async function previewSincronizarTabelaPreco(
  cotacaoId: string
): Promise<{ preview: PreviewSincronizacao } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const cotacao = await prisma.cotacao.findUnique({
    where: { id: cotacaoId },
    select: {
      fornecedorId: true,
      fornecedor: { select: { nomeFantasia: true, razaoSocial: true } },
      itens: { select: { materialEletricoId: true, precoUnitario: true } },
    },
  });
  if (!cotacao) return { erro: "Cotação não encontrada." };

  const itensComPreco = cotacao.itens.filter((i) => i.materialEletricoId && Number(i.precoUnitario) > 0);
  const itensSemMaterial = cotacao.itens.filter((i) => !i.materialEletricoId).length;

  const tabelaAtiva = await prisma.tabelaPrecoFornecedor.findFirst({
    where: { fornecedorId: cotacao.fornecedorId, status: "ATIVA" },
    select: { nome: true },
  });

  return {
    preview: {
      fornecedorNome: cotacao.fornecedor.nomeFantasia ?? cotacao.fornecedor.razaoSocial,
      totalItensComPreco: itensComPreco.length,
      totalItensSemMaterialVinculado: itensSemMaterial,
      tabelaDestino: tabelaAtiva?.nome ?? "Nova tabela (nenhuma ativa hoje)",
    },
  };
}

/**
 * Atualiza a Tabela de Preços do fornecedor com os preços dessa
 * cotação. Pedido pelo Henrique em 12/08/2026: "os materiais que
 * importei/digitei numa cotação de obra devem poder atualizar o
 * catálogo geral do fornecedor" — sem passo duplicado, tudo dentro do
 * fluxo de cotação, mas com confirmação explícita (ver
 * previewSincronizarTabelaPreco).
 *
 * Casa pelo Código Interno do Material (materialEletricoId) — mesmo
 * critério usado na importação normal de tabela de preços. Itens sem
 * material vinculado são ignorados (não têm como casar).
 *
 * Se o fornecedor não tiver nenhuma tabela ATIVA hoje, cria uma nova
 * automaticamente (nome com a data), pra não travar a sincronização
 * exigindo passo manual extra.
 */
export async function sincronizarTabelaPrecoFornecedor(
  cotacaoId: string
): Promise<{ ok: true; itensAtualizados: number } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const cotacao = await prisma.cotacao.findUnique({
    where: { id: cotacaoId },
    select: {
      fornecedorId: true,
      itens: {
        where: { materialEletricoId: { not: null } },
        select: { materialEletricoId: true, descricao: true, unidade: true, fabricante: true, precoUnitario: true },
      },
    },
  });
  if (!cotacao) return { erro: "Cotação não encontrada." };

  const itensValidos = cotacao.itens.filter((i) => Number(i.precoUnitario) > 0);
  if (itensValidos.length === 0) {
    return { erro: "Nenhum item com preço e material vinculado pra sincronizar." };
  }

  let tabelaAtiva = await prisma.tabelaPrecoFornecedor.findFirst({
    where: { fornecedorId: cotacao.fornecedorId, status: "ATIVA" },
  });

  if (!tabelaAtiva) {
    const hoje = new Date();
    const daquiUmAno = new Date(hoje);
    daquiUmAno.setFullYear(daquiUmAno.getFullYear() + 1);
    tabelaAtiva = await prisma.tabelaPrecoFornecedor.create({
      data: {
        fornecedorId: cotacao.fornecedorId,
        nome: `Atualizada via cotação — ${hoje.toLocaleDateString("pt-BR")}`,
        vigenciaInicio: hoje,
        vigenciaFim: daquiUmAno,
        usuarioImportacaoId: sessao.user.id,
        status: "ATIVA",
        observacoes: "Criada automaticamente ao sincronizar preços de uma cotação.",
      },
    });
  }

  let itensAtualizados = 0;
  for (const item of itensValidos) {
    const existente = await prisma.itemTabelaPreco.findFirst({
      where: { tabelaId: tabelaAtiva.id, materialEletricoId: item.materialEletricoId },
    });
    if (existente) {
      await prisma.itemTabelaPreco.update({
        where: { id: existente.id },
        data: { valorUnitario: item.precoUnitario, descricao: item.descricao, unidade: item.unidade, marca: item.fabricante },
      });
    } else {
      await prisma.itemTabelaPreco.create({
        data: {
          tabelaId: tabelaAtiva.id,
          materialEletricoId: item.materialEletricoId,
          descricao: item.descricao,
          unidade: item.unidade,
          valorUnitario: item.precoUnitario,
          marca: item.fabricante,
        },
      });
    }
    itensAtualizados++;
    if (item.materialEletricoId) {
      await sincronizarProdutoFornecedor(cotacao.fornecedorId, item.materialEletricoId, Number(item.precoUnitario));
    }
  }

  revalidatePath(`/fornecedores/${cotacao.fornecedorId}/tabelas-de-preco`);
  revalidatePath(`/fornecedores/${cotacao.fornecedorId}`);
  return { ok: true, itensAtualizados };
}
