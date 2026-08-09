/**
 * Migra o histórico antigo de DecisaoNegociacao (v1, só aceito/recusado)
 * pra InteracaoNegociacao (v2, timeline completa). Rodar uma vez:
 * npx tsx src/infra/db/prisma/migrar-decisoes-para-interacoes.ts
 *
 * Idempotente — pode rodar de novo sem duplicar (pula quem já foi migrado).
 */
import { prisma } from "./client";

async function main() {
  const decisoesAntigas = await prisma.decisaoNegociacao.findMany();
  console.log(`${decisoesAntigas.length} decisão(ões) antiga(s) encontrada(s).`);

  let migradas = 0;
  for (const d of decisoesAntigas) {
    const jaExiste = await prisma.interacaoNegociacao.findFirst({
      where: {
        empreendimentoId: d.empreendimentoId,
        createdAt: d.createdAt,
        tipo: d.decisao === "ACEITO" ? "GANHA" : "PERDIDA",
      },
    });
    if (jaExiste) continue;

    await prisma.interacaoNegociacao.create({
      data: {
        empreendimentoId: d.empreendimentoId,
        tipo: d.decisao === "ACEITO" ? "GANHA" : "PERDIDA",
        cotacaoVencedoraId: d.cotacaoVencedoraId,
        motivoPerda: d.decisao === "RECUSADO" ? "OUTRO" : null,
        observacoes: d.observacoes,
        registradoPorId: d.registradoPorId,
        createdAt: d.createdAt,
      },
    });
    migradas++;
  }

  console.log(`${migradas} interação(ões) criada(s) a partir do histórico antigo.`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
