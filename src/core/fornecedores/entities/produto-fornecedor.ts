// Item na lista de preços de um fornecedor específico.
// Referencia um MaterialEletrico do catálogo global (matching exato)
// com um preço aproximado editável.
export interface ProdutoFornecedor {
  id: string;
  fornecedorId: string;
  materialEletricoId: string;
  precoUnitario: number;
  observacoes: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Dados do material (join) — sempre carregados junto pra evitar N+1
  material: {
    id: string;
    fabricante: string;
    categoria: string;
    nome: string;
    especificacao: string | null;
    unidade: string;
    precoUnitario: number; // preço-alvo do catálogo global (referência)
    kit: string;
  };
}

export interface ProdutoFornecedorFiltros {
  fornecedorId?: string;
  ativo?: boolean;
  fabricante?: string;
  busca?: string;
}
