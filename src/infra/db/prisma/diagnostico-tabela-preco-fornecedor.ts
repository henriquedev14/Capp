import { prisma } from "./client";

async function main() {
  const fornecedorId = "cmrxkach4000001phduz5squy";

  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: fornecedorId },
    select: { id: true, razaoSocial: true, nomeFantasia: true },
  });
  console.log("Fornecedor:", fornecedor);

  const tabelas = await prisma.tabelaPrecoFornecedor.findMany({
    where: { fornecedorId },
    select: {
      id: true,
      nome: true,
      status: true,
      dataImportacao: true,
      _count: { select: { itens: true } },
    },
    orderBy: { dataImportacao: "desc" },
  });

  console.log(`\n${tabelas.length} tabela(s) de preço encontrada(s):`);
  for (const t of tabelas) {
    console.log(`  - ${t.nome} | status: ${t.status} | itens: ${t._count.itens} | importada em: ${t.dataImportacao}`);
  }

  const ativas = tabelas.filter((t) => t.status === "ATIVA");
  console.log(`\n${ativas.length} tabela(s) com status ATIVA.`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
