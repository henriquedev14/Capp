import { prisma } from "./client";

/**
 * Backfill único — sincroniza TODOS os itens de tabelas de preço ATIVAS
 * já existentes com ProdutoFornecedor, pra "Produtos e Preços" mostrar
 * o que já tinha sido importado antes da sincronização automática
 * existir. Rodar uma vez só. 13/08/2026.
 */
async function main() {
  const tabelasAtivas = await prisma.tabelaPrecoFornecedor.findMany({
    where: { status: "ATIVA" },
    include: { itens: true },
  });

  console.log(`${tabelasAtivas.length} tabela(s) ativa(s) encontrada(s).`);

  let sincronizados = 0;
  let semMaterial = 0;

  for (const tabela of tabelasAtivas) {
    for (const item of tabela.itens) {
      if (!item.materialEletricoId) {
        semMaterial++;
        continue;
      }
      await prisma.produtoFornecedor.upsert({
        where: {
          fornecedorId_materialEletricoId: {
            fornecedorId: tabela.fornecedorId,
            materialEletricoId: item.materialEletricoId,
          },
        },
        update: { precoUnitario: item.valorUnitario },
        create: {
          fornecedorId: tabela.fornecedorId,
          materialEletricoId: item.materialEletricoId,
          precoUnitario: item.valorUnitario,
        },
      });
      sincronizados++;
    }
  }

  console.log(`\n${sincronizados} produto(s) sincronizado(s).`);
  if (semMaterial > 0) console.log(`${semMaterial} item(ns) sem material vinculado, ignorado(s).`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
