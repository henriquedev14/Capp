import { prisma } from "./client";

async function main() {
  const emp = await prisma.empreendimento.findFirst({
    where: { nome: { contains: "LAGUNA", mode: "insensitive" } },
    select: { id: true, nome: true, status: true, excluidoEm: true, excluidoPorId: true, updatedAt: true },
  });

  if (!emp) {
    console.log("Nenhum empreendimento com 'LAGUNA' no nome foi encontrado.");
    return;
  }

  console.log(JSON.stringify(emp, null, 2));

  if (emp.excluidoEm) {
    console.log("\n✅ Está arquivado (excluidoEm preenchido).");
  } else {
    console.log("\n❌ NÃO está arquivado (excluidoEm é null) — por isso continua contando nos dashboards.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
