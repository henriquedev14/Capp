import { prisma } from "./client";

async function main() {
  const tipologias = await prisma.tipologia.findMany({
    where: { nome: { contains: "3401" } },
    select: {
      id: true,
      nome: true,
      empreendimento: { select: { nome: true } },
      levantamentosMateriais: {
        select: {
          id: true,
          status: true,
          validadoEm: true,
          validadoPor: { select: { nome: true } },
          criadoPor: { select: { nome: true } },
          createdAt: true,
          updatedAt: true,
          itens: { select: { id: true } },
        },
      },
    },
  });

  if (tipologias.length === 0) {
    console.log("Nenhuma tipologia encontrada com '3401' no nome.");
    return;
  }

  for (const t of tipologias) {
    console.log(`\nTipologia: ${t.nome} (${t.empreendimento.nome})`);
    console.log(`  ${t.levantamentosMateriais.length} levantamento(s) de materiais:`);
    for (const l of t.levantamentosMateriais) {
      console.log(`  - id: ${l.id}`);
      console.log(`    status: ${l.status}`);
      console.log(`    itens: ${l.itens.length}`);
      console.log(`    validadoEm: ${l.validadoEm} | validadoPor: ${l.validadoPor?.nome ?? "—"}`);
      console.log(`    criadoPor: ${l.criadoPor?.nome ?? "—"} | createdAt: ${l.createdAt} | updatedAt: ${l.updatedAt}`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
