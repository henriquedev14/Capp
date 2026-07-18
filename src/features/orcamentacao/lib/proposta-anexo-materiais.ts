import type { LevantamentoMateriais } from "@/core/orcamentacao/entities/material-catalogo";

export interface ItemAnexoProposta {
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface GrupoAnexoProposta {
  fabricante: string;
  itens: ItemAnexoProposta[];
  subtotal: number;
}

export interface AnexoMateriaisProposta {
  grupos: GrupoAnexoProposta[];
  totalGeral: number;
}

/**
 * Monta o anexo de materiais da Proposta Comercial, agrupado por fabricante
 * (ex: "WAGO — CONECTORES"), somando a Quantidade Total do Levantamento de
 * Materiais entre TODAS as tipologias do empreendimento — mesma agregação
 * usada na aba Consolidado do Levantamento, só que aqui com valor monetário
 * (a aba Consolidado propositalmente não mostra preço, é outra tela/outro
 * propósito).
 *
 * Some materiais podem não ter fabricante real cadastrado no catálogo ainda
 * (ficam como "Genérico" — ver conta-fixa... não, ver seed do catálogo) —
 * nesse caso todos caem num grupo "Genérico" só, em vez de divididos por
 * marca. Isso é esperado até o catálogo ser completado com fabricante real
 * por item.
 */
export function montarAnexoMateriaisProposta(levantamentos: LevantamentoMateriais[]): AnexoMateriaisProposta {
  // chave = fabricante -> (chave do item -> acumulado)
  const porFabricante = new Map<
    string,
    Map<string, { descricao: string; unidade: string; quantidade: number; valorTotal: number; precoUnitario: number }>
  >();

  for (const lev of levantamentos) {
    for (const item of lev.itens) {
      const fabricante = item.fabricante || "Genérico";
      const chaveItem = item.materialCatalogoId ? `cat:${item.materialCatalogoId}` : `desc:${item.descricao}`;

      if (!porFabricante.has(fabricante)) porFabricante.set(fabricante, new Map());
      const grupo = porFabricante.get(fabricante)!;

      const valorLinha = item.quantidade * item.precoUnitario;
      const atual = grupo.get(chaveItem);
      if (atual) {
        atual.quantidade += item.quantidade;
        atual.valorTotal += valorLinha;
      } else {
        grupo.set(chaveItem, {
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valorTotal: valorLinha,
          precoUnitario: item.precoUnitario,
        });
      }
    }
  }

  const grupos: GrupoAnexoProposta[] = Array.from(porFabricante.entries())
    .map(([fabricante, itensMap]) => {
      const itens: ItemAnexoProposta[] = Array.from(itensMap.values())
        .map((i) => ({
          descricao: i.descricao,
          unidade: i.unidade,
          quantidade: i.quantidade,
          valorUnitario: i.precoUnitario,
          valorTotal: i.valorTotal,
        }))
        .sort((a, b) => a.descricao.localeCompare(b.descricao));
      return {
        fabricante,
        itens,
        subtotal: itens.reduce((s, i) => s + i.valorTotal, 0),
      };
    })
    .sort((a, b) => a.fabricante.localeCompare(b.fabricante));

  return {
    grupos,
    totalGeral: grupos.reduce((s, g) => s + g.subtotal, 0),
  };
}
