import type { ItemMaterialOrcamento } from "@/core/orcamentacao/entities/orcamento";

export interface ItemAnexoProposta {
  descricao: string;
  marca: string;
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

const SEM_FORNECEDOR = "A definir";
const NAO_INFORMADO_ANEXO = "Não informado";

/**
 * Monta o anexo de materiais da Proposta Comercial, agrupado pelo
 * FORNECEDOR REAL selecionado no Orçamento (Bloco 2) — não mais pelo
 * catálogo genérico do Levantamento. Isso garante que TODOS os
 * fornecedores aplicados via Tabela de Preços (ou Cotação) apareçam
 * separados na Proposta, com a marca real de cada um.
 *
 * Item sem fornecedor selecionado ainda (preço de catálogo/estimativa,
 * nunca precificado por Tabela de Preços ou Cotação) cai no grupo
 * "A definir" — visível de propósito, pra ficar claro que ainda falta
 * decidir o fornecedor daquele material antes de fechar.
 */
export function montarAnexoMateriaisPorFornecedor(
  itensOrcamento: ItemMaterialOrcamento[],
  nomeFornecedorPorId: Map<string, string>
): AnexoMateriaisProposta {
  const porFornecedor = new Map<string, ItemAnexoProposta[]>();

  for (const item of itensOrcamento) {
    const nomeFornecedor = item.fornecedorSelecionadoId
      ? nomeFornecedorPorId.get(item.fornecedorSelecionadoId) ?? SEM_FORNECEDOR
      : SEM_FORNECEDOR;

    if (!porFornecedor.has(nomeFornecedor)) porFornecedor.set(nomeFornecedor, []);
    porFornecedor.get(nomeFornecedor)!.push({
      descricao: item.descricao,
      marca: item.marca || NAO_INFORMADO_ANEXO,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: item.precoUnitario ?? 0,
      valorTotal: item.total ?? 0,
    });
  }

  const grupos: GrupoAnexoProposta[] = Array.from(porFornecedor.entries())
    .map(([fabricante, itens]) => ({
      fabricante,
      itens: itens.sort((a, b) => a.descricao.localeCompare(b.descricao)),
      subtotal: itens.reduce((s, i) => s + i.valorTotal, 0),
    }))
    // "A definir" sempre por último — grupos com fornecedor real primeiro.
    .sort((a, b) => {
      if (a.fabricante === SEM_FORNECEDOR) return 1;
      if (b.fabricante === SEM_FORNECEDOR) return -1;
      return a.fabricante.localeCompare(b.fabricante);
    });

  return {
    grupos,
    totalGeral: grupos.reduce((s, g) => s + g.subtotal, 0),
  };
}
