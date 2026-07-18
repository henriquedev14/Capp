"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

// Ações do catálogo de produtos por fornecedor.
// A permissão FORNECEDOR_EDITAR já cobre a edição do fornecedor —
// reaproveitamos ela aqui em vez de criar uma nova permissão só pra
// preços (menos ruído na UI de papéis).

interface Resultado {
  erro?: string;
  ok?: boolean;
}

export async function adicionarProdutoFornecedor(
  fornecedorId: string,
  materialEletricoId: string
): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  const material = await prisma.materialEletrico.findUnique({
    where: { id: materialEletricoId },
    select: { precoUnitario: true, ativo: true },
  });
  if (!material || !material.ativo) {
    return { erro: "Material não encontrado ou inativo no catálogo." };
  }

  // Verifica duplicidade explicitamente pra dar mensagem útil (o unique
  // do schema já cobriria, mas com erro genérico do Prisma).
  const jaExiste = await prisma.produtoFornecedor.findUnique({
    where: {
      fornecedorId_materialEletricoId: { fornecedorId, materialEletricoId },
    },
    select: { id: true },
  });
  if (jaExiste) {
    return { erro: "Este material já está na lista deste fornecedor." };
  }

  await prisma.produtoFornecedor.create({
    data: {
      fornecedorId,
      materialEletricoId,
      // Preço inicial = preço-alvo do catálogo. Usuário edita em seguida.
      precoUnitario: material.precoUnitario,
    },
  });

  revalidatePath(`/fornecedores/${fornecedorId}`);
  return { ok: true };
}

export async function atualizarPrecoProduto(
  produtoId: string,
  novoPreco: number
): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  if (!Number.isFinite(novoPreco) || novoPreco < 0) {
    return { erro: "Preço inválido." };
  }

  const produto = await prisma.produtoFornecedor.update({
    where: { id: produtoId },
    data: { precoUnitario: novoPreco },
    select: { fornecedorId: true },
  });

  revalidatePath(`/fornecedores/${produto.fornecedorId}`);
  return { ok: true };
}

export async function removerProdutoFornecedor(produtoId: string): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  const produto = await prisma.produtoFornecedor.delete({
    where: { id: produtoId },
    select: { fornecedorId: true },
  });

  revalidatePath(`/fornecedores/${produto.fornecedorId}`);
  return { ok: true };
}

export async function toggleAtivoProduto(produtoId: string): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  const atual = await prisma.produtoFornecedor.findUnique({
    where: { id: produtoId },
    select: { ativo: true, fornecedorId: true },
  });
  if (!atual) return { erro: "Produto não encontrado." };

  await prisma.produtoFornecedor.update({
    where: { id: produtoId },
    data: { ativo: !atual.ativo },
  });

  revalidatePath(`/fornecedores/${atual.fornecedorId}`);
  return { ok: true };
}

/**
 * Aplica o preço de UM item da tabela na Análise do catálogo do
 * fornecedor — cria o vínculo ProdutoFornecedor se ainda não existir
 * (fornecedor passa a vender esse material), ou só atualiza o preço se já
 * existir. Também aprende o código do fornecedor (se veio do PDF), pra
 * próximas importações casarem esse item sozinhas.
 *
 * Diferente de `atualizarPrecoProduto`: essa função não exige que o
 * vínculo já exista — é o ponto de entrada da importação de TABELA DE
 * PREÇOS geral do fornecedor (distinto de responder uma Cotação
 * específica de um Orçamento — ver `cotacao-actions.ts`).
 */
export async function aplicarItemTabelaPrecoFornecedor(
  fornecedorId: string,
  materialEletricoId: string,
  input: { codigo?: string; precoUnitario: number }
): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  if (!Number.isFinite(input.precoUnitario) || input.precoUnitario < 0) {
    return { erro: "Preço inválido." };
  }

  try {
    await prisma.produtoFornecedor.upsert({
      where: { fornecedorId_materialEletricoId: { fornecedorId, materialEletricoId } },
      create: {
        fornecedorId,
        materialEletricoId,
        precoUnitario: input.precoUnitario,
        codigoFornecedor: input.codigo || null,
      },
      update: {
        precoUnitario: input.precoUnitario,
        ...(input.codigo ? { codigoFornecedor: input.codigo } : {}),
      },
    });
  } catch (e) {
    // Conflito de unique(fornecedorId, codigoFornecedor): esse código já
    // está aprendido pra OUTRO material desse fornecedor. Aplica o preço
    // mesmo assim, mas sem sobrescrever o código aprendido (evita
    // corromper um aprendizado anterior por engano de match).
    console.error("[aplicarItemTabelaPrecoFornecedor] conflito ao salvar código, tentando sem código:", e);
    await prisma.produtoFornecedor.upsert({
      where: { fornecedorId_materialEletricoId: { fornecedorId, materialEletricoId } },
      create: { fornecedorId, materialEletricoId, precoUnitario: input.precoUnitario },
      update: { precoUnitario: input.precoUnitario },
    });
  }

  revalidatePath(`/fornecedores/${fornecedorId}`);
  return { ok: true };
}

function normalizarTextoMaterial(v: string): string {
  return v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Match por sobreposição de palavras contra TODO o catálogo global —
 * usado como fallback quando o código do fornecedor ainda não foi
 * aprendido. Só retorna algo com pelo menos 2 palavras em comum (evita
 * sugerir qualquer material só porque "caixa" apareceu em ambos).
 *
 * Importante: só funciona pros itens do PDF que têm descrição extraível
 * como texto — boa parte dos itens de fornecedores com descrição em 2+
 * linhas não tem (ver diagnóstico em extrair-precos-cotacao.ts), esses
 * continuam precisando de busca manual na primeira importação.
 */
export async function sugerirMaterialPorDescricao(
  descricao: string
): Promise<SugestaoMaterialTabelaPreco | null> {
  const palavrasDescricao = new Set(
    normalizarTextoMaterial(descricao).split(" ").filter((p) => p.length > 2)
  );
  if (palavrasDescricao.size === 0) return null;

  const materiais = await prisma.materialEletrico.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, fabricante: true, especificacao: true, categoria: true },
  });

  let melhor: { id: string; texto: string; pontuacao: number } | null = null;
  for (const m of materiais) {
    const textoIndexavel = [m.fabricante, m.categoria, m.nome, m.especificacao].filter(Boolean).join(" ");
    const palavrasMaterial = normalizarTextoMaterial(textoIndexavel).split(" ").filter((p) => p.length > 2);
    const pontuacao = palavrasMaterial.filter((p) => palavrasDescricao.has(p)).length;
    if (pontuacao > 0 && (!melhor || pontuacao > melhor.pontuacao)) {
      melhor = {
        id: m.id,
        texto: [m.fabricante, m.nome, m.especificacao].filter(Boolean).join(" — "),
        pontuacao,
      };
    }
  }

  // Exige pelo menos 2 palavras em comum — 1 palavra só ("caixa", "luva")
  // dá muito falso positivo num catálogo com centenas de itens.
  if (!melhor || melhor.pontuacao < 2) return null;

  return { materialEletricoId: melhor.id, descricao: melhor.texto, precoAtual: null };
}

export interface SugestaoMaterialTabelaPreco {
  materialEletricoId: string;
  descricao: string;
  precoAtual: number | null; // preço atual desse fornecedor pra esse material, se já vendia
}

/**
 * Match por código já aprendido (ver `codigoFornecedor` em ProdutoFornecedor)
 * — usado na importação de tabela de preços geral. Só funciona depois que
 * alguém já confirmou esse código manualmente uma vez.
 */
export async function sugerirMaterialPorCodigoFornecedor(
  fornecedorId: string,
  codigo: string
): Promise<SugestaoMaterialTabelaPreco | null> {
  const produto = await prisma.produtoFornecedor.findFirst({
    where: { fornecedorId, codigoFornecedor: codigo },
    select: {
      precoUnitario: true,
      materialEletricoId: true,
      materialEletrico: { select: { nome: true, fabricante: true, especificacao: true } },
    },
  });
  if (!produto) return null;

  const m = produto.materialEletrico;
  return {
    materialEletricoId: produto.materialEletricoId,
    descricao: [m.fabricante, m.nome, m.especificacao].filter(Boolean).join(" — "),
    precoAtual: Number(produto.precoUnitario),
  };
}

interface DadosNovoMaterial {
  fabricante: string;
  categoria: string;
  nome: string;
  especificacao?: string;
  unidade: string;
  kit: "ELETRICO" | "QDC";
  precoUnitario: number;
}

/**
 * Cria um material novo direto no catálogo global E já vincula esse
 * fornecedor a ele (com o mesmo preço informado). Existe porque as telas
 * de catálogo (Catálogo Elétrico/PEX) saíram do menu principal — agora o
 * cadastro de material novo acontece só por aqui, na tela do Fornecedor,
 * pra não ficar sem nenhum jeito de adicionar algo que ainda não existe.
 */
export async function criarMaterialECadastrarNoFornecedor(
  fornecedorId: string,
  dados: DadosNovoMaterial
): Promise<Resultado & { produtoId?: string }> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  const fabricante = dados.fabricante.trim();
  const categoria = dados.categoria.trim();
  const nome = dados.nome.trim();
  const unidade = dados.unidade.trim() || "un";

  if (!fabricante || !categoria || !nome) {
    return { erro: "Preencha fabricante, categoria e nome do material." };
  }
  if (!Number.isFinite(dados.precoUnitario) || dados.precoUnitario < 0) {
    return { erro: "Preço inválido." };
  }

  const material = await prisma.materialEletrico.create({
    data: {
      fabricante,
      categoria,
      nome,
      especificacao: dados.especificacao?.trim() || null,
      unidade,
      kit: dados.kit,
      precoUnitario: dados.precoUnitario,
    },
  });

  const produto = await prisma.produtoFornecedor.create({
    data: {
      fornecedorId,
      materialEletricoId: material.id,
      precoUnitario: dados.precoUnitario,
    },
    select: { id: true },
  });

  revalidatePath(`/fornecedores/${fornecedorId}`);
  return { ok: true, produtoId: produto.id };
}
