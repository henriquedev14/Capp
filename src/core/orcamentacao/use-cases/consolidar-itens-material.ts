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
  /** JÁ inclui a margem de perda de 10% (MARGEM_PERDA_MATERIAL) — não é a
   *  soma bruta dos itens do Orçamento. */
  quantidade: number;
  /** Preço unitário REAL, sem margem — a margem só se aplica à
   *  quantidade/total, o preço por unidade do material não muda. */
  precoUnitario: number;
  /** JÁ inclui a margem de 10% (mesma base que `quantidade`). */
  total: number;
  /** Nomes das tipologias que contribuíram — null se só uma (não repete o óbvio) */
  tipologias: string[];
  /** Só mostra a origem se TODOS os itens consolidados vierem da mesma fonte. */
  origemUnica: "COTACAO" | "TABELA_PRECO" | null;
}

/**
 * Margem de perda/quebra aplicada a todo material consolidado — compra
 * sempre um pouco a mais do que o levantamento pede, pra cobrir corte,
 * quebra e sobra de instalação. Pedido pelo Henrique em 19/08/2026,
 * pra valer em TUDO que deriva do total de materiais — Bloco 2 do
 * Orçamento, valor do contrato, Anexo de Materiais da Proposta —
 * porque "o valor é espelhado do material, reflete em tudo pra
 * frente". Ele pediu explicitamente pra margem nunca aparecer visível
 * em lugar nenhum — os números finais já vêm com ela embutida, sem
 * rótulo "+10%" à vista.
 */
export const MARGEM_PERDA_MATERIAL = 0.1;

/** Aplica a margem de perda a um valor (quantidade ou R$) — fonte única,
 *  pra nunca ter o `* 1.1` duplicado e divergindo em lugares diferentes. */
export function aplicarMargemMaterial(valor: number): number {
  return valor * (1 + MARGEM_PERDA_MATERIAL);
}

/**
 * Consolida os itens de material do Bloco 2 do Orçamento, somando
 * quantidade/total de um mesmo material (descrição + marca + unidade)
 * que hoje aparece repetido uma vez por tipologia, e aplica a margem de
 * perda de 10% (MARGEM_PERDA_MATERIAL) em cima da soma. Pedido pelo
 * Henrique em 06/08/2026: "Cabo Verde 2,5mm" não precisa de uma linha
 * por tipologia, só o total — e em 19/08/2026: some 10% a mais na
 * quantidade final de cada material.
 *
 * Puramente de exibição — não mexe nos registros ItemMaterialOrcamento
 * por trás (cada tipologia continua com seu próprio item no banco, sem
 * margem, só a TELA agrupa e acrescenta a margem).
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
    const quantidadeBruta = grupoItens.reduce((s, i) => s + i.quantidade, 0);
    const totalBruto = grupoItens.reduce((s, i) => s + (i.total ?? 0), 0);
    // Preço médio ponderado, calculado ANTES da margem — na prática é
    // sempre o mesmo valor entre tipologias (mesmo material, mesmo
    // fornecedor), mas calcular assim é matematicamente correto mesmo
    // se algum dia divergir. A margem de 10% entra só depois, em cima
    // da quantidade/total já consolidados — não muda o preço por
    // unidade do material.
    const precoUnitario = quantidadeBruta > 0 ? totalBruto / quantidadeBruta : 0;
    const quantidade = aplicarMargemMaterial(quantidadeBruta);
    const total = aplicarMargemMaterial(totalBruto);

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
