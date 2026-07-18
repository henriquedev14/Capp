import { prisma } from "@/infra/db/prisma/client";
import { seedMateriaisEletrico } from "@/infra/db/prisma/seed-materiais-eletrico";

/**
 * SCRIPT DE USO ÚNICO — 15/07/2026.
 *
 * Apaga TODOS os materiais elétricos existentes e recarrega o catálogo com
 * os novos códigos oficiais HGI (ver seed-materiais-eletrico.ts).
 *
 * Confirmado com o Henrique antes de rodar:
 *   - 0 materiais tinham estoque, movimentação ou pedido de compra vinculado
 *     (nada bloqueia o delete por Restrict).
 *   - 39 materiais tinham preço de fornecedor importado (ProdutoFornecedor)
 *     — são apagados junto (Cascade). Confirmado: "apagar tudo mesmo assim".
 *   - 8 itens de orçamento e 8 de levantamento referenciavam materiais
 *     antigos — esses guardam snapshot próprio (descrição/valor/quantidade),
 *     então só perdem o link de volta pro catálogo (SetNull), não perdem
 *     dado nenhum.
 *
 * Não deixar isso rodando em nenhum lugar do fluxo normal — é destrutivo e
 * só deve ser executado manualmente, uma vez, via:
 *   npx tsx src/infra/db/prisma/clear-and-reseed-materiais-eletrico.ts
 */
async function main() {
  const antes = await prisma.materialEletrico.count();
  console.log(`[clear-and-reseed] ${antes} materiais existentes — apagando todos...`);

  await prisma.materialEletrico.deleteMany({});

  const depoisDoDelete = await prisma.materialEletrico.count();
  console.log(`[clear-and-reseed] ${depoisDoDelete} materiais restantes (esperado: 0). Recarregando catálogo...`);

  await seedMateriaisEletrico();

  const total = await prisma.materialEletrico.count();
  console.log(`[clear-and-reseed] Concluído — ${total} materiais no catálogo agora.`);
}

main()
  .catch((e) => {
    console.error("[clear-and-reseed] ERRO:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
