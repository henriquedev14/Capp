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

// ---------------------------------------------------------------------------
// Gates de geração/uso da Proposta Comercial (extraídos de proposta-actions.ts
// na Tarefa 2.1.2 — antes viviam misturados direto no corpo da action)
// ---------------------------------------------------------------------------

export interface ResultadoGeracaoProposta {
  permitido: boolean;
  motivo?: string;
}

/**
 * Só permite gerar a proposta com o orçamento aprovado — e, se já existe
 * uma proposta gerada pra essa revisão, exige perfil sênior (Diretor/Admin)
 * pra sobrescrever (trava contra geração acidental duplicada por um perfil
 * comum). Função pura — quem chama já buscou o orçamento e checou o perfil
 * do usuário.
 */
export function verificarPodeGerarProposta(
  orcamento: { status: string; propostaGeradaEm: Date | null },
  usuarioEhGestorSenior: boolean
): ResultadoGeracaoProposta {
  if (orcamento.status !== "ORCAMENTO_APROVADO") {
    return { permitido: false, motivo: "Só é possível gerar a proposta com o orçamento aprovado pelo gestor." };
  }
  if (orcamento.propostaGeradaEm && !usuarioEhGestorSenior) {
    return {
      permitido: false,
      motivo: "A proposta desta revisão já foi gerada e está travada. Somente Diretor ou Admin podem gerar novamente.",
    };
  }
  return { permitido: true };
}

/**
 * Exige que a proposta já tenha sido gerada antes de registrar a decisão
 * do cliente (aceite/recusa) — não faz sentido registrar decisão sobre
 * um documento que ainda não existe.
 */
export function verificarPropostaJaGerada(orcamento: {
  propostaGeradaEm: Date | null;
}): ResultadoGeracaoProposta {
  if (!orcamento.propostaGeradaEm) {
    return { permitido: false, motivo: "Gere a proposta comercial antes de registrar a decisão do cliente." };
  }
  return { permitido: true };
}
