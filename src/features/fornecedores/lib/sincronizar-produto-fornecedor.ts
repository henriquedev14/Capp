import { prisma } from "@/infra/db/prisma/client";

/**
 * UPSERT do produto do fornecedor a partir de QUALQUER origem (planilha
 * importada, sincronização de cotação, ou edição individual de item) —
 * pra tudo aparecer numa lista só ("Produtos e Preços"), em vez de
 * ficar espalhado em telas diferentes que ninguém olha. Pedido pelo
 * Henrique em 13/08/2026: "quero os itens junto com Produtos e Preços".
 */
export async function sincronizarProdutoFornecedor(
  fornecedorId: string,
  materialEletricoId: string,
  precoUnitario: number
): Promise<void> {
  await prisma.produtoFornecedor.upsert({
    where: { fornecedorId_materialEletricoId: { fornecedorId, materialEletricoId } },
    update: { precoUnitario },
    create: { fornecedorId, materialEletricoId, precoUnitario },
  });
}
