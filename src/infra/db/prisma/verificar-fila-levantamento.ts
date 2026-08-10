import { prisma } from "./client";

async function main() {
  const todos = await prisma.empreendimento.findMany({
    where: { status: "ORCAMENTACAO", excluidoEm: null },
    select: { id: true, nome: true, responsavelOrcamentacaoUserId: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`${todos.length} empreendimento(s) em status ORCAMENTACAO (exibido como "Engenharia"):\n`);
  for (const e of todos) {
    console.log(
      `- ${e.nome} | responsável: ${e.responsavelOrcamentacaoUserId ?? "NENHUM (deveria aparecer na fila)"}`
    );
  }

  const semResponsavel = todos.filter((e) => !e.responsavelOrcamentacaoUserId);
  console.log(`\n${semResponsavel.length} sem responsável — deveriam aparecer em "Aguardando Levantamento".`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
