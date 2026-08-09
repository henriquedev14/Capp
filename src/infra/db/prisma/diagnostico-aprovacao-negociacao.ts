import { prisma } from "./client";

async function main() {
  const orcamentos = await prisma.orcamento.findMany({
    where: { statusAprovacao: "APROVADO" },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      revisao: true,
      status: true,
      statusAprovacao: true,
      propostaGeradaEm: true,
      updatedAt: true,
      empreendimento: { select: { id: true, nome: true, status: true } },
    },
  });

  console.log(`${orcamentos.length} orçamento(s) aprovado(s) mais recente(s):\n`);
  for (const o of orcamentos) {
    console.log(`Empreendimento: ${o.empreendimento.nome}`);
    console.log(`  Empreendimento.status: ${o.empreendimento.status}`);
    console.log(`  Orcamento.status: ${o.status}`);
    console.log(`  Orcamento.statusAprovacao: ${o.statusAprovacao}`);
    console.log(`  propostaGeradaEm: ${o.propostaGeradaEm}`);
    console.log(`  Atualizado em: ${o.updatedAt}`);
    console.log("");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
