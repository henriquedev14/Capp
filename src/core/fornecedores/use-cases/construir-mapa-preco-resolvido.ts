import { resolverPrecoFornecedor } from "@/core/fornecedores/use-cases/resolver-preco-fornecedor";

/**
 * Monta o mapa (materialEletricoId → preço) de um fornecedor, aplicando
 * o resolver de preço (Tarefa 2.3.3): prefere a Tabela de Preços vigente
 * sobre a referência estática do ProdutoFornecedor, quando as duas
 * existem pro mesmo material. O CONJUNTO de materiais cotáveis continua
 * sendo definido só pelo ProdutoFornecedor (não expande pra materiais
 * que só existem na tabela) — mudar isso afetaria o aprendizado de
 * código do fornecedor, que depende do ProdutoFornecedor existir.
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

  const mapa = new Map<string, number>();
  for (const produto of fornecedor.produtosOferecidos) {
    if (!produto.materialEletricoId) continue;
    const resolvido = resolverPrecoFornecedor({
      itemTabelaPreco: itensTabela.has(produto.materialEletricoId)
        ? { valorUnitario: itensTabela.get(produto.materialEletricoId)!, nomeTabela: "", data: tabela!.dataImportacao }
        : null,
      produtoFornecedor: { precoUnitario: Number(produto.precoUnitario) },
    });
    if (resolvido) mapa.set(produto.materialEletricoId, resolvido.precoUnitario);
  }
  return mapa;
}
