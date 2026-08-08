import type { ItemMaterialOrcamento } from "@/core/orcamentacao/entities/orcamento";
import { consolidarItensPorMaterial } from "@/core/orcamentacao/use-cases/consolidar-itens-material";

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
  const porFornecedor = new Map<string, ItemMaterialOrcamento[]>();

  for (const item of itensOrcamento) {
    const nomeFornecedor = item.fornecedorSelecionadoId
      ? nomeFornecedorPorId.get(item.fornecedorSelecionadoId) ?? SEM_FORNECEDOR
      : SEM_FORNECEDOR;

    if (!porFornecedor.has(nomeFornecedor)) porFornecedor.set(nomeFornecedor, []);
    porFornecedor.get(nomeFornecedor)!.push(item);
  }

  const grupos: GrupoAnexoProposta[] = Array.from(porFornecedor.entries())
    // Item sem fornecedor selecionado não vai pra Proposta — cliente
    // não deve ver "A definir" num documento que já foi enviado pra
    // ele. Fica só internamente (Bloco 2/Cotação) até ser precificado
    // de verdade. Pedido pelo Henrique em 08/08/2026.
    .filter(([fabricante]) => fabricante !== SEM_FORNECEDOR)
    .map(([fabricante, itensDoFornecedor]) => {
      // Consolida o mesmo material vindo de tipologias diferentes numa
      // linha só, somando quantidade/total — mesma regra já aplicada no
      // Bloco 2 do Orçamento (achado #8, 06/08/2026), que nunca tinha
      // chegado até a Proposta. Achado pelo Henrique em 08/08/2026,
      // vendo materiais repetidos N vezes no Anexo.
      const consolidados = consolidarItensPorMaterial(
        itensDoFornecedor.map((item, i) => ({
          id: `${fabricante}-${i}`,
          descricao: item.descricao,
          marca: item.marca || NAO_INFORMADO_ANEXO,
          unidade: item.unidade,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario ?? 0,
          total: item.total ?? 0,
        }))
      );

      const itens: ItemAnexoProposta[] = consolidados
        .map((c) => ({
          descricao: c.descricao,
          marca: c.marca ?? NAO_INFORMADO_ANEXO,
          unidade: c.unidade,
          quantidade: c.quantidade,
          valorUnitario: c.precoUnitario,
          valorTotal: c.total,
        }))
        .sort((a, b) => a.descricao.localeCompare(b.descricao));

      return {
        fabricante,
        itens,
        subtotal: itens.reduce((s, i) => s + i.valorTotal, 0),
      };
    })
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
