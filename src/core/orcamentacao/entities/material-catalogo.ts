export type KitMaterial = "ELETRICO" | "QDC";
export type StatusLevantamentoMateriais = "RASCUNHO" | "VALIDADO";

export interface MaterialCatalogo {
  id: string;
  fabricante: string;
  categoria?: string | null;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  kit: KitMaterial;
  ativo: boolean;
}

export interface ItemLevantamentoMaterial {
  id: string;
  levantamentoId: string;
  materialCatalogoId?: string | null;
  fabricante: string;
  categoria?: string | null;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  quantidade: number;
  // Quebra do cálculo — vem do upload da planilha (quantidade unitária ×
  // repetições = quantidade total). Nulos quando o item foi adicionado
  // manualmente (não tem essa quebra).
  quantidadeUnitaria?: number | null;
  repeticoes?: number | null;
  createdAt: Date;
}

export interface LevantamentoMateriais {
  id: string;
  empreendimentoId: string;
  tipologiaId: string;
  tipologiaNome?: string;
  status: StatusLevantamentoMateriais;
  itens: ItemLevantamentoMaterial[];
  criadoPorId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrupoFabricanteMaterial {
  fabricante: string;
  itens: ItemLevantamentoMaterial[];
  subtotal: number;
}

/** Agrupa os itens por fabricante com subtotal — mesmo formato da planilha. */
export function agruparPorFabricante(itens: ItemLevantamentoMaterial[]): GrupoFabricanteMaterial[] {
  const mapa = new Map<string, ItemLevantamentoMaterial[]>();
  for (const item of itens) {
    if (!mapa.has(item.fabricante)) mapa.set(item.fabricante, []);
    mapa.get(item.fabricante)!.push(item);
  }
  return Array.from(mapa.entries())
    .map(([fabricante, itensGrupo]) => ({
      fabricante,
      itens: itensGrupo,
      subtotal: itensGrupo.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0),
    }))
    .sort((a, b) => a.fabricante.localeCompare(b.fabricante));
}

export function totalGeralMateriais(itens: ItemLevantamentoMaterial[]): number {
  return itens.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0);
}

export interface ItemConsolidado {
  chave: string;
  descricao: string;
  categoria: string | null;
  unidade: string;
  quantidadeTotal: number;
  vinculadoAoCatalogo: boolean;
}

/**
 * Soma a Quantidade Total de material entre TODAS as tipologias do
 * empreendimento (rascunho ou validado). Agrupa por materialCatalogoId
 * quando o item veio do upload e casou com o catálogo — é a chave
 * confiável. Sem catálogo (item manual, ou código da planilha sem match),
 * agrupa por descrição+categoria como aproximação — pode duplicar linha se
 * a descrição divergir entre tipologias, mas não há chave melhor nesse caso.
 */
export function consolidarMateriaisEntreTipologias(levantamentos: LevantamentoMateriais[]): ItemConsolidado[] {
  const mapa = new Map<string, ItemConsolidado>();
  for (const lev of levantamentos) {
    for (const item of lev.itens) {
      const chave = item.materialCatalogoId ? `cat:${item.materialCatalogoId}` : `desc:${item.descricao}|${item.categoria ?? ""}`;
      const atual = mapa.get(chave);
      if (atual) {
        atual.quantidadeTotal += item.quantidade;
      } else {
        mapa.set(chave, {
          chave,
          descricao: item.descricao,
          categoria: item.categoria ?? null,
          unidade: item.unidade,
          quantidadeTotal: item.quantidade,
          vinculadoAoCatalogo: !!item.materialCatalogoId,
        });
      }
    }
  }
  return Array.from(mapa.values()).sort((a, b) => a.descricao.localeCompare(b.descricao));
}
