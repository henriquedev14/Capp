import { prisma } from "./client";

async function main() {
  const emp = await prisma.empreendimento.findFirst({
    where: { nome: { contains: "FIORD" } },
    select: { id: true, nome: true, status: true },
  });
  if (!emp) {
    console.log("FIORD não encontrado.");
    return;
  }
  console.log(`Empreendimento: ${emp.nome} | status: ${emp.status}\n`);

  const interacoes = await prisma.interacaoNegociacao.findMany({
    where: { empreendimentoId: emp.id },
    orderBy: { createdAt: "desc" },
  });

  console.log(`${interacoes.length} interação(ões) encontrada(s):\n`);
  for (const i of interacoes) {
    console.log(`- tipo: ${i.tipo} | criado em: ${i.createdAt} | valorNegociado: ${i.valorNegociado}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
