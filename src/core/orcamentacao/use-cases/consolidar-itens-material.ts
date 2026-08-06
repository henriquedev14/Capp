export interface ItemMaterialParaConsolidar {
  id: string;
  descricao: string;
  categoria?: string | null;
  marca?: string | null;
  unidade: string;
  quantidade: number;
  precoUnitario?: number | null;
  total?: number | null;
  tipologiaNome?: string | null;
  cotacaoItemId?: string | null;
  itemTabelaPrecoId?: string | null;
}

export interface ItemMaterialConsolidado {
  id: string; // id do primeiro item do grupo — só pra servir de key em listas
  descricao: string;
  categoria?: string | null;
  marca?: string | null;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  /** Nomes das tipologias que contribuíram — null se só uma (não repete o óbvio) */
  tipologias: string[];
  /** Só mostra a origem se TODOS os itens consolidados vierem da mesma fonte. */
  origemUnica: "COTACAO" | "TABELA_PRECO" | null;
}

/**
 * Consolida os itens de material do Bloco 2 do Orçamento, somando
 * quantidade/total de um mesmo material (descrição + marca + unidade)
 * que hoje aparece repetido uma vez por tipologia. Pedido pelo Henrique
 * em 06/08/2026: "Cabo Verde 2,5mm" não precisa de uma linha por
 * tipologia, só o total.
 *
 * Puramente de exibição — não mexe nos registros ItemMaterialOrcamento
 * por trás (cada tipologia continua com seu próprio item no banco,
 * só a TELA agrupa).
 */
export function consolidarItensPorMaterial(
  itens: ItemMaterialParaConsolidar[]
): ItemMaterialConsolidado[] {
  const grupos = new Map<string, ItemMaterialParaConsolidar[]>();

  for (const item of itens) {
    const chave = `${item.descricao}::${item.marca ?? ""}::${item.unidade}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(item);
  }

  const resultado: ItemMaterialConsolidado[] = [];
  for (const grupoItens of grupos.values()) {
    const primeiro = grupoItens[0]!;
    const quantidade = grupoItens.reduce((s, i) => s + i.quantidade, 0);
    const total = grupoItens.reduce((s, i) => s + (i.total ?? 0), 0);
    // Preço médio ponderado — na prática é sempre o mesmo valor entre
    // tipologias (mesmo material, mesmo fornecedor), mas calcular assim
    // é matematicamente correto mesmo se algum dia divergir.
    const precoUnitario = quantidade > 0 ? total / quantidade : 0;

    const tipologias = Array.from(
      new Set(grupoItens.map((i) => i.tipologiaNome).filter((t): t is string => !!t))
    );

    const origensCotacao = new Set(grupoItens.map((i) => i.cotacaoItemId ?? null));
    const origensTabela = new Set(grupoItens.map((i) => i.itemTabelaPrecoId ?? null));
    let origemUnica: ItemMaterialConsolidado["origemUnica"] = null;
    if (grupoItens.every((i) => i.cotacaoItemId) && origensCotacao.size >= 1) origemUnica = "COTACAO";
    else if (grupoItens.every((i) => i.itemTabelaPrecoId) && origensTabela.size >= 1) origemUnica = "TABELA_PRECO";

    resultado.push({
      id: primeiro.id,
      descricao: primeiro.descricao,
      categoria: primeiro.categoria,
      marca: primeiro.marca,
      unidade: primeiro.unidade,
      quantidade,
      precoUnitario,
      total,
      tipologias,
      origemUnica,
    });
  }

  return resultado.sort((a, b) => a.descricao.localeCompare(b.descricao));
}
