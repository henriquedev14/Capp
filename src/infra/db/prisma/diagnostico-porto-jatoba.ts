import { prisma } from "./client";

async function main() {
  const emp = await prisma.empreendimento.findUnique({
    where: { id: "cmshleoj7000001ny53mzwqxu" },
    select: {
      id: true,
      nome: true,
      status: true,
      kitEletrico: true,
      kitHidraulico: true,
      responsavelOrcamentacaoUserId: true,
      tipologias: {
        select: {
          id: true,
          nome: true,
          levantamentos: { select: { id: true, status: true } },
          levantamentosMateriais: { select: { id: true, status: true } },
          levantamentosHidraulicos: { select: { id: true, status: true } },
        },
      },
      orcamentos: {
        orderBy: { revisao: "desc" },
        take: 1,
        select: { id: true, status: true, statusAprovacao: true },
      },
    },
  });

  if (!emp) {
    console.log("Empreendimento não encontrado.");
    return;
  }

  console.log(`Nome: ${emp.nome}`);
  console.log(`Status: ${emp.status}`);
  console.log(`kitEletrico: ${emp.kitEletrico} | kitHidraulico: ${emp.kitHidraulico}`);
  console.log(`Responsável orçamentação: ${emp.responsavelOrcamentacaoUserId ?? "NENHUM"}`);
  console.log(`Orçamento mais recente: ${emp.orcamentos[0]?.status ?? "SEM ORÇAMENTO"}\n`);

  console.log(`${emp.tipologias.length} tipologia(s):\n`);
  for (const t of emp.tipologias) {
    console.log(`- ${t.nome}`);
    console.log(`  Levantamentos elétricos (${t.levantamentos.length}): ${t.levantamentos.map((l) => l.status).join(", ") || "NENHUM"}`);
    console.log(`  Levantamentos materiais (${t.levantamentosMateriais.length}): ${t.levantamentosMateriais.map((l) => l.status).join(", ") || "NENHUM"}`);
    console.log(`  Levantamentos hidráulicos (${t.levantamentosHidraulicos.length}): ${t.levantamentosHidraulicos.map((l) => l.status).join(", ") || "NENHUM"}`);
    console.log("");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
