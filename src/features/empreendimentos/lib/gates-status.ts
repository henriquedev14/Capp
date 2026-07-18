import { prisma } from "@/infra/db/prisma/client";

/**
 * Verifica se toda tipologia contratada tem os levantamentos necessários
 * validados — condição pra avançar Orçamentação → Negociação (não faz
 * sentido negociar/gerar proposta com quantitativo de levantamento ainda
 * não validado).
 */
export async function verificarGateOrcamentacao(
  empreendimentoId: string,
  kitEletrico: boolean,
  kitHidraulico: boolean
): Promise<{ ok: true } | { erro: string }> {
  const tipologias = await prisma.tipologia.findMany({
    where: { empreendimentoId },
    select: {
      id: true,
      nome: true,
      levantamentos: { select: { status: true } },
      levantamentosMateriais: { select: { status: true } },
      levantamentosHidraulicos: { select: { status: true } },
    },
  });

  const pendencias: string[] = [];
  for (const t of tipologias) {
    if (kitEletrico) {
      if (!t.levantamentos.some((l) => l.status === "VALIDADO")) {
        pendencias.push(`${t.nome} (Levantamento Elétrico)`);
      }
      if (!t.levantamentosMateriais.some((l) => l.status === "VALIDADO")) {
        pendencias.push(`${t.nome} (Levantamento de Materiais)`);
      }
    }
    if (kitHidraulico && t.nome !== "Hall") {
      if (!t.levantamentosHidraulicos.some((l) => l.status === "VALIDADO")) {
        pendencias.push(`${t.nome} (Levantamento Hidráulico)`);
      }
    }
  }

  if (pendencias.length > 0) {
    return {
      erro: `Falta validar: ${pendencias.join(", ")}. Vá em Levantamentos, valide o que falta, e só depois conclua a Orçamentação de novo.`,
    };
  }
  return { ok: true };
}

/**
 * Verifica se a revisão mais recente do orçamento já teve a proposta
 * comercial gerada — condição pra avançar Orçamentação → Negociação.
 */
export async function verificarGateNegociacao(
  empreendimentoId: string
): Promise<{ ok: true } | { erro: string }> {
  const ultimoOrcamento = await prisma.orcamento.findFirst({
    where: { empreendimentoId },
    orderBy: { revisao: "desc" },
    select: { propostaGeradaEm: true },
  });
  if (!ultimoOrcamento?.propostaGeradaEm) {
    return {
      erro: "Gere a proposta comercial antes de avançar para Negociação — sem ela não há o que apresentar ao cliente.",
    };
  }
  return { ok: true };
}
