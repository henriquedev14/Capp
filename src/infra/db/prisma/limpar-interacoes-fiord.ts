import { prisma } from "./client";

async function main() {
  const emp = await prisma.empreendimento.findFirst({
    where: { nome: { contains: "FIORD" } },
    select: { id: true, nome: true },
  });
  if (!emp) {
    console.log("FIORD não encontrado.");
    return;
  }

  const resultado = await prisma.interacaoNegociacao.deleteMany({
    where: { empreendimentoId: emp.id },
  });

  console.log(`${resultado.count} interação(ões) removida(s) do ${emp.nome}. Pronto pra testar do zero.`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
