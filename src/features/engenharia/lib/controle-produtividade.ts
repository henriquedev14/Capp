import { prisma } from "@/infra/db/prisma/client";

export type TipoReferenciaEngenharia = "ELETRICA" | "HIDRAULICA" | "MATERIAIS";

export async function garantirControleEngenharia(input: {
  tipo: TipoReferenciaEngenharia;
  referenciaId: string;
  empreendimentoId: string;
  tipologiaId?: string | null;
  executorId?: string | null;
}) {
  return prisma.engenhariaControle.upsert({
    where: {
      referenciaTipo_referenciaId: {
        referenciaTipo: input.tipo,
        referenciaId: input.referenciaId,
      },
    },
    create: {
      referenciaTipo: input.tipo,
      referenciaId: input.referenciaId,
      empreendimentoId: input.empreendimentoId,
      tipologiaId: input.tipologiaId ?? null,
      executorId: input.executorId ?? null,
    },
    update: {
      empreendimentoId: input.empreendimentoId,
      tipologiaId: input.tipologiaId ?? null,
      // executorId não é alterado aqui: uma atribuição explícita da
      // coordenação sempre prevalece sobre o criador original.
    },
  });
}

export async function registrarRetrabalhoEngenharia(input: {
  tipo: TipoReferenciaEngenharia;
  referenciaId: string;
  empreendimentoId: string;
  tipologiaId?: string | null;
  executorId?: string | null;
}) {
  const controle = await garantirControleEngenharia(input);
  const [atualizado] = await prisma.$transaction([
    prisma.engenhariaControle.update({
      where: { id: controle.id },
      data: { retrabalhos: { increment: 1 } },
    }),
    prisma.engenhariaControleEvento.create({
      data: { controleId: controle.id, tipo: "RETRABALHO", motivo: "Levantamento validado retornou para RASCUNHO" },
    }),
  ]);
  return atualizado;
}
