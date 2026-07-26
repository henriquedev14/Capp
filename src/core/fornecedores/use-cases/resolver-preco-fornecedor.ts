export interface FontePreco {
  origem: "COTACAO" | "TABELA_PRECO" | "REFERENCIA";
  precoUnitario: number;
  /** Contexto de onde veio, pra mostrar na tela ("Tabela Julho/2026", "Cotação #123", etc.) */
  detalheOrigem: string;
  data: Date;
}

export interface CandidatosPreco {
  cotacaoItem?: { precoUnitario: number; numeroCotacao: string; data: Date } | null;
  itemTabelaPreco?: { valorUnitario: number; nomeTabela: string; data: Date } | null;
  produtoFornecedor?: { precoUnitario: number } | null;
}

/**
 * Resolve qual preço usar pra um (fornecedor, material), em ordem de
 * confiança: Cotação aceita pro projeto específico > Tabela de Preços
 * vigente > preço de referência (ProdutoFornecedor).
 *
 * Função pura — recebe os candidatos já buscados (quem chama faz as 3
 * consultas), só decide qual vale. Desenhada na Tarefa 2.3.1
 * (`docs/unificacao-precos-fornecedor.md`) — resolve a inconsistência de
 * "cada tela decide o preço do seu jeito" sem migrar nenhum dado entre
 * as 3 tabelas (que representam conceitos de negócio genuinamente
 * diferentes, não duplicatas).
 */
export function resolverPrecoFornecedor(candidatos: CandidatosPreco): FontePreco | null {
  if (candidatos.cotacaoItem) {
    return {
      origem: "COTACAO",
      precoUnitario: candidatos.cotacaoItem.precoUnitario,
      detalheOrigem: `Cotação ${candidatos.cotacaoItem.numeroCotacao}`,
      data: candidatos.cotacaoItem.data,
    };
  }
  if (candidatos.itemTabelaPreco) {
    return {
      origem: "TABELA_PRECO",
      precoUnitario: candidatos.itemTabelaPreco.valorUnitario,
      detalheOrigem: `Tabela ${candidatos.itemTabelaPreco.nomeTabela}`,
      data: candidatos.itemTabelaPreco.data,
    };
  }
  if (candidatos.produtoFornecedor) {
    return {
      origem: "REFERENCIA",
      precoUnitario: candidatos.produtoFornecedor.precoUnitario,
      detalheOrigem: "Preço de referência",
      data: new Date(0),
    };
  }
  return null;
}
