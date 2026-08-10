"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

const PERMISSAO_FILA = PERMISSOES.RESPONSABILIDADE_ORCAMENTACAO;

/**
 * Tomar Propriedade — a ÚNICA forma de virar responsável pela
 * Orçamentação/Engenharia de um empreendimento, exclusiva da Fila
 * "Aguardando Levantamento". Inicia o relógio de SLA (tomouPropriedadeEm).
 * Item 2 da Jornada do Orçamento, 10/08/2026.
 */
export async function tomarPropriedadeDaFila(empreendimentoId: string): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSAO_FILA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  const atual = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: { responsavelOrcamentacaoUserId: true },
  });
  if (!atual) return { erro: "Empreendimento não encontrado." };
  if (atual.responsavelOrcamentacaoUserId) {
    return { erro: "Esse item já tem responsável — alguém tomou propriedade antes de você." };
  }

  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { responsavelOrcamentacaoUserId: sessao.user.id, tomouPropriedadeEm: new Date() },
  });

  await prisma.logMovimentacaoOrcamento.create({
    data: { empreendimentoId, tipo: "TOMOU_PROPRIEDADE", usuarioId: sessao.user.id },
  });

  revalidatePath("/orcamentacao");
  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  return { ok: true };
}

/**
 * Devolver pra Fila — libera a demanda pra outra pessoa pegar, sem
 * resetar o trabalho de levantamento já feito (confirmado com o
 * Henrique em 10/08/2026: só perde o dono, o progresso fica salvo).
 * Sempre registra log — obrigatório pra auditoria.
 */
export async function devolverParaFila(
  empreendimentoId: string,
  motivo: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSAO_FILA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!motivo.trim()) return { erro: "Informe o motivo da devolução — fica registrado no log de auditoria." };

  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { responsavelOrcamentacaoUserId: null, tomouPropriedadeEm: null },
  });

  await prisma.logMovimentacaoOrcamento.create({
    data: { empreendimentoId, tipo: "DEVOLVEU_FILA", motivo: motivo.trim(), usuarioId: sessao.user.id },
  });

  revalidatePath("/orcamentacao");
  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true };
}
