import { prisma } from "./client";

async function main() {
  const [
    empreendimentosComResponsavel,
    empreendimentosSemResponsavel,
    levantamentosEletricosRascunhoComCriador,
    levantamentosEletricosRascunhoSemCriador,
    orcamentosComResponsavel,
    orcamentosSemResponsavel,
  ] = await Promise.all([
    prisma.empreendimento.count({
      where: { excluidoEm: null, status: { notIn: ["CONCLUIDO", "ARQUIVADO"] }, responsavelComercialUserId: { not: null } },
    }),
    prisma.empreendimento.count({
      where: { excluidoEm: null, status: { notIn: ["CONCLUIDO", "ARQUIVADO"] }, responsavelComercialUserId: null },
    }),
    prisma.levantamentoEletrico.count({ where: { status: "RASCUNHO", criadoPorId: { not: null } } }),
    prisma.levantamentoEletrico.count({ where: { status: "RASCUNHO", criadoPorId: null } }),
    prisma.orcamento.count({ where: { status: { not: "ORCAMENTO_APROVADO" }, responsavelId: { not: null } } }),
    prisma.orcamento.count({ where: { status: { not: "ORCAMENTO_APROVADO" }, responsavelId: null } }),
  ]);

  console.log("=== Comercial ===");
  console.log(`Empreendimentos ativos COM responsável: ${empreendimentosComResponsavel}`);
  console.log(`Empreendimentos ativos SEM responsável: ${empreendimentosSemResponsavel}`);

  console.log("\n=== Engenharia (Elétrico) ===");
  console.log(`Rascunhos COM criadoPorId: ${levantamentosEletricosRascunhoComCriador}`);
  console.log(`Rascunhos SEM criadoPorId: ${levantamentosEletricosRascunhoSemCriador}`);

  console.log("\n=== Orçamentista ===");
  console.log(`Orçamentos abertos COM responsável: ${orcamentosComResponsavel}`);
  console.log(`Orçamentos abertos SEM responsável: ${orcamentosSemResponsavel}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
