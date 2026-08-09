import { prisma } from "./client";

async function main() {
  // Empreendimentos ainda em ORCAMENTACAO, mas cujo orçamento mais
  // recente já foi aprovado pelo gestor — isso NÃO deveria acontecer
  // se a transição automática estivesse funcionando.
  const empreendimentos = await prisma.empreendimento.findMany({
    where: { status: "ORCAMENTACAO", excluidoEm: null },
    select: {
      id: true,
      nome: true,
      status: true,
      updatedAt: true,
      orcamentos: {
        orderBy: { revisao: "desc" },
        take: 1,
        select: { statusAprovacao: true, status: true, updatedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  console.log(`${empreendimentos.length} empreendimento(s) ainda em ORCAMENTACAO:\n`);
  for (const e of empreendimentos) {
    const orc = e.orcamentos[0];
    const suspeito = orc?.statusAprovacao === "APROVADO" ? " ⚠ APROVADO MAS NÃO MIGROU" : "";
    console.log(`${e.nome}${suspeito}`);
    console.log(`  Empreendimento atualizado em: ${e.updatedAt}`);
    console.log(`  Orçamento.statusAprovacao: ${orc?.statusAprovacao ?? "sem orçamento"}`);
    console.log(`  Orçamento.status: ${orc?.status ?? "-"}`);
    console.log("");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
