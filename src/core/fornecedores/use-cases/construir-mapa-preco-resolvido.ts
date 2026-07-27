import { resolverPrecoFornecedor } from "@/core/fornecedores/use-cases/resolver-preco-fornecedor";

/**
 * Monta o mapa (materialEletricoId → preço) de um fornecedor, aplicando
 * o resolver de preço: prefere a Tabela de Preços vigente sobre a
 * referência estática do ProdutoFornecedor, quando as duas existem pro
 * mesmo material.
 *
 * CORREÇÃO 27/07/2026 (achado ao vivo em produção): o conjunto de
 * materiais "cotáveis" agora inclui também os que só existem na Tabela
 * de Preços, não só os que já têm ProdutoFornecedor. Motivo: um
 * fornecedor cujo preço só veio de Tabela importada (nunca passou por
 * uma Cotação) nunca teria ProdutoFornecedor — e por isso nunca
 * aparecia como cotável, numa dependência circular (precisa cotar pra
 * poder cotar). A troca de código do fornecedor continua só sendo
 * aprendida via ProdutoFornecedor — isso aqui é só sobre "esse
 * fornecedor tem preço pra esse material", que a Tabela também prova.
 */
export function construirMapaPrecoResolvido(fornecedor: {
  produtosOferecidos: { materialEletricoId: string | null; precoUnitario: unknown }[];
  tabelasPreco: { dataImportacao: Date; itens: { materialEletricoId: string | null; valorUnitario: unknown }[] }[];
}): Map<string, number> {
  const tabela = fornecedor.tabelasPreco[0];
  const itensTabela = new Map(
    (tabela?.itens ?? [])
      .filter((i) => i.materialEletricoId)
      .map((i) => [i.materialEletricoId as string, Number(i.valorUnitario)])
  );
  const produtosPorMaterial = new Map(
    fornecedor.produtosOferecidos
      .filter((p) => p.materialEletricoId)
      .map((p) => [p.materialEletricoId as string, Number(p.precoUnitario)])
  );

  const todosOsMateriais = new Set([...itensTabela.keys(), ...produtosPorMaterial.keys()]);

  const mapa = new Map<string, number>();
  for (const materialId of todosOsMateriais) {
    const resolvido = resolverPrecoFornecedor({
      itemTabelaPreco: itensTabela.has(materialId)
        ? { valorUnitario: itensTabela.get(materialId)!, nomeTabela: "", data: tabela!.dataImportacao }
        : null,
      produtoFornecedor: produtosPorMaterial.has(materialId)
        ? { precoUnitario: produtosPorMaterial.get(materialId)! }
        : null,
    });
    if (resolvido) mapa.set(materialId, resolvido.precoUnitario);
  }
  return mapa;
}
