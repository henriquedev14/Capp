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
  console.log(`${emp.nome} | status: ${emp.status}\n`);

  const contas = await prisma.contaReceber.findMany({
    where: { empreendimentoId: emp.id },
    select: { id: true, valor: true, dataPrevista: true, recebido: true, createdAt: true },
  });

  console.log(`${contas.length} conta(s) a receber encontrada(s):\n`);
  for (const c of contas) {
    console.log(`- R$ ${c.valor} | prevista: ${c.dataPrevista} | recebido: ${c.recebido} | criada em: ${c.createdAt}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
