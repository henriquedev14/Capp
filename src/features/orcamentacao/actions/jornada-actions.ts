"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/infra/auth/auth-options.full";
import { OrcamentacaoPrismaRepository } from "@/infra/db/prisma/repositories/orcamentacao-prisma-repository";
import { exigirPermissao, temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import {
  validarConsistenciaOrcamento,
  montarChecklistOrcamento,
  podeAvancarEtapa,
} from "@/core/orcamentacao/use-cases/jornada-orcamento";
import { ETAPAS_JORNADA, type EtapaJornada } from "@/core/orcamentacao/entities/orcamento";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

const repo = new OrcamentacaoPrismaRepository();

// ---------------------------------------------------------------------------
// Responsável e prazo
// ---------------------------------------------------------------------------

export async function atribuirResponsavelOrcamento(
  orcamentoId: string,
  empreendimentoId: string,
  input: { responsavelId?: string | null; dataPrazo?: string | null }
): Promise<{ erro: string } | { ok: true }> {
  const session = await exigirPermissao(PERMISSOES.ORCAMENTO_GERENCIAR_JORNADA);
  const bloqueio1 = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio1.permitido) return { erro: bloqueio1.motivo! };

  const orcamentoAntes = await repo.buscarPorId(orcamentoId);
  if (!orcamentoAntes) return { erro: "Orçamento não encontrado." };

  await repo.atualizarResponsavelPrazo(orcamentoId, {
    responsavelId: input.responsavelId ?? null,
    dataPrazo: input.dataPrazo ? new Date(input.dataPrazo) : null,
  });

  await repo.registrarHistorico({
    orcamentoId,
    tipoAlteracao: "RESPONSAVEL_PRAZO_ALTERADO",
    recursoTipo: "Orcamento",
    recursoId: orcamentoId,
    valorAnterior: { responsavelId: orcamentoAntes.responsavelId, dataPrazo: orcamentoAntes.dataPrazo },
    valorNovo: input,
    registradoPorId: session.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  revalidatePath("/orcamentacao");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Jornada — avançar/bloquear etapas
// ---------------------------------------------------------------------------

export async function buscarJornadaOrcamento(orcamentoId: string) {
  return repo.buscarJornada(orcamentoId);
}

/**
 * Verifica se o orçamento pode avançar da etapa atual para a próxima,
 * retornando o motivo do bloqueio quando não pode (Parte 4 da spec: nenhum
 * botão desabilitado sem explicação).
 */
export async function verificarTransicaoEtapa(
  orcamentoId: string,
  etapaAtual: EtapaJornada
): Promise<{ permitido: boolean; motivo?: string }> {
  const orcamento = await repo.buscarPorId(orcamentoId);
  if (!orcamento) return { permitido: false, motivo: "Orçamento não encontrado." };

  const jornada = await repo.buscarJornada(orcamentoId);
  const etapaCotacoes = jornada.find((j) => j.etapa === "COTACOES");

  return podeAvancarEtapa({
    etapaAtual,
    temLevantamentoValidado: orcamento.itensServico.length > 0,
    itensServico: orcamento.itensServico,
    itensMaterial: orcamento.itensMaterial,
    fornecedoresPendentesHaMuitoTempo: 0, // calculado na página com dados de Cotacao
    cotacaoSelecionada: etapaCotacoes?.status === "CONCLUIDA",
    totalMateriaisArmazenado: orcamento.totalMateriais,
  });
}

export async function avancarEtapaOrcamento(
  orcamentoId: string,
  empreendimentoId: string,
  etapaAtual: EtapaJornada
): Promise<{ erro: string } | { ok: true }> {
  const session = await exigirPermissao(PERMISSOES.ORCAMENTO_GERENCIAR_JORNADA);
  const bloqueio2 = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio2.permitido) return { erro: bloqueio2.motivo! };

  const idx = ETAPAS_JORNADA.indexOf(etapaAtual);
  const proxima = ETAPAS_JORNADA[idx + 1];
  if (!proxima) return { erro: "Esta já é a última etapa da jornada." };

  const verificacao = await verificarTransicaoEtapa(orcamentoId, etapaAtual);
  if (!verificacao.permitido) {
    return { erro: verificacao.motivo ?? "Não é possível avançar esta etapa." };
  }

  await repo.avancarJornada(orcamentoId, etapaAtual, proxima);

  await repo.registrarHistorico({
    orcamentoId,
    tipoAlteracao: "ETAPA_AVANCADA",
    recursoTipo: "OrcamentoJornada",
    valorAnterior: { etapa: etapaAtual },
    valorNovo: { etapa: proxima },
    registradoPorId: session.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true };
}

export async function bloquearEtapaOrcamento(
  orcamentoId: string,
  empreendimentoId: string,
  etapa: EtapaJornada,
  motivo: string
): Promise<{ erro: string } | { ok: true }> {
  const session = await exigirPermissao(PERMISSOES.ORCAMENTO_GERENCIAR_JORNADA);
  const bloqueio3 = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio3.permitido) return { erro: bloqueio3.motivo! };

  if (!motivo.trim()) return { erro: "Informe o motivo do bloqueio." };

  await repo.atualizarEtapaJornada(orcamentoId, etapa, {
    status: "BLOQUEADA",
    motivoBloqueio: motivo,
  });

  await repo.registrarHistorico({
    orcamentoId,
    tipoAlteracao: "ETAPA_BLOQUEADA",
    recursoTipo: "OrcamentoJornada",
    justificativa: motivo,
    registradoPorId: session.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export async function buscarChecklistOrcamento(orcamentoId: string) {
  const orcamento = await repo.buscarPorId(orcamentoId);
  if (!orcamento) return null;

  const problemas = validarConsistenciaOrcamento({
    itensServico: orcamento.itensServico,
    itensMaterial: orcamento.itensMaterial,
    totalMateriaisArmazenado: orcamento.totalMateriais,
  });

  const checklist = montarChecklistOrcamento({
    itensServico: orcamento.itensServico,
    itensMaterial: orcamento.itensMaterial,
    totalFornecedoresConsultados: 0, // preenchido na página com dados de Cotacao
    totalFornecedoresRespondidos: 0,
    cotacaoSelecionada: orcamento.itensMaterial.some((i) => i.cotacaoItemId != null),
    margemPrevista: orcamento.margemPrevista,
    margemMeta: null,
  });

  return { checklist, problemas };
}

// ---------------------------------------------------------------------------
// Aprovação
// ---------------------------------------------------------------------------

export async function enviarOrcamentoParaAprovacao(
  orcamentoId: string,
  empreendimentoId: string
): Promise<{ erro: string } | { ok: true }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { erro: "Sessão expirada. Faça login novamente." };
  const bloqueio4 = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio4.permitido) return { erro: bloqueio4.motivo! };

  const orcamento = await repo.buscarPorId(orcamentoId);
  if (!orcamento) return { erro: "Orçamento não encontrado." };

  const problemas = validarConsistenciaOrcamento({
    itensServico: orcamento.itensServico,
    itensMaterial: orcamento.itensMaterial,
    totalMateriaisArmazenado: orcamento.totalMateriais,
  });
  if (problemas.length > 0) {
    return {
      erro: `Não é possível enviar: ${problemas.length} inconsistência(s) encontrada(s). Resolva o checklist antes de enviar.`,
    };
  }

  await repo.enviarParaAprovacao(orcamentoId);
  await repo.atualizarEtapaJornada(orcamentoId, "APROVACAO", { status: "EM_ANDAMENTO" });

  await repo.registrarHistorico({
    orcamentoId,
    tipoAlteracao: "APROVACAO_ENVIADA",
    recursoTipo: "Orcamento",
    recursoId: orcamentoId,
    registradoPorId: session.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  revalidatePath("/orcamentacao");
  return { ok: true };
}

export async function aprovarOrcamento(
  orcamentoId: string,
  empreendimentoId: string
): Promise<{ erro: string } | { ok: true }> {
  const session = await exigirPermissao(PERMISSOES.ORCAMENTO_APROVAR);
  const bloqueio5 = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio5.permitido) return { erro: bloqueio5.motivo! };

  await repo.aprovarOrcamento(orcamentoId, session.user.id);
  await repo.atualizarEtapaJornada(orcamentoId, "APROVACAO", { status: "APROVADA" });

  await repo.registrarHistorico({
    orcamentoId,
    tipoAlteracao: "APROVACAO_CONCEDIDA",
    recursoTipo: "Orcamento",
    recursoId: orcamentoId,
    registradoPorId: session.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  revalidatePath("/orcamentacao");
  return { ok: true };
}

export async function devolverOrcamento(
  orcamentoId: string,
  empreendimentoId: string,
  motivo: string
): Promise<{ erro: string } | { ok: true }> {
  const session = await exigirPermissao(PERMISSOES.ORCAMENTO_APROVAR);
  const bloqueio6 = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio6.permitido) return { erro: bloqueio6.motivo! };

  if (!motivo.trim()) return { erro: "Informe o motivo da devolução." };

  await repo.devolverOrcamento(orcamentoId, motivo);
  await repo.atualizarEtapaJornada(orcamentoId, "APROVACAO", {
    status: "DEVOLVIDA",
    motivoBloqueio: motivo,
  });

  await repo.registrarHistorico({
    orcamentoId,
    tipoAlteracao: "APROVACAO_DEVOLVIDA",
    recursoTipo: "Orcamento",
    recursoId: orcamentoId,
    justificativa: motivo,
    registradoPorId: session.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  revalidatePath("/orcamentacao");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

export async function buscarHistoricoOrcamento(orcamentoId: string, limite?: number) {
  return repo.buscarHistorico(orcamentoId, limite);
}

// ---------------------------------------------------------------------------
// Situação e justificativa dos itens (Bloco 1 e Bloco 2)
// ---------------------------------------------------------------------------

export async function atualizarSituacaoItemServico(
  itemId: string,
  orcamentoId: string,
  empreendimentoId: string,
  input: { situacao: string; justificativa?: string | null }
): Promise<{ erro: string } | { ok: true }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { erro: "Sessão expirada. Faça login novamente." };

  if (input.situacao !== "NORMAL" && !input.justificativa?.trim()) {
    return { erro: "Justificativa é obrigatória para esta situação." };
  }
  const bloqueio7 = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio7.permitido) return { erro: bloqueio7.motivo! };

  const { prisma } = await import("@/infra/db/prisma/client");
  const antes = await prisma.itemServicoOrcamento.findUnique({ where: { id: itemId } });
  if (!antes) return { erro: "Item não encontrado." };

  await prisma.itemServicoOrcamento.update({
    where: { id: itemId },
    data: { situacao: input.situacao, justificativa: input.justificativa ?? null },
  });

  await repo.registrarHistorico({
    orcamentoId,
    tipoAlteracao: "ITEM_EDITADO",
    recursoTipo: "ItemServicoOrcamento",
    recursoId: itemId,
    valorAnterior: { situacao: antes.situacao, justificativa: antes.justificativa },
    valorNovo: input,
    justificativa: input.justificativa,
    registradoPorId: session.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true };
}

export async function atualizarSituacaoItemMaterial(
  itemId: string,
  orcamentoId: string,
  empreendimentoId: string,
  input: { situacao: string; justificativa?: string | null }
): Promise<{ erro: string } | { ok: true }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { erro: "Sessão expirada. Faça login novamente." };

  if (
    input.situacao !== "NORMAL" &&
    input.situacao !== "PENDENTE_PRECIFICACAO" &&
    !input.justificativa?.trim()
  ) {
    return { erro: "Justificativa é obrigatória para esta situação." };
  }
  const bloqueio8 = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!bloqueio8.permitido) return { erro: bloqueio8.motivo! };

  const { prisma } = await import("@/infra/db/prisma/client");
  const antes = await prisma.itemMaterialOrcamento.findUnique({ where: { id: itemId } });
  if (!antes) return { erro: "Item não encontrado." };

  await prisma.itemMaterialOrcamento.update({
    where: { id: itemId },
    data: { situacao: input.situacao, justificativa: input.justificativa ?? null },
  });

  await repo.registrarHistorico({
    orcamentoId,
    tipoAlteracao: "ITEM_EDITADO",
    recursoTipo: "ItemMaterialOrcamento",
    recursoId: itemId,
    valorAnterior: { situacao: antes.situacao, justificativa: antes.justificativa },
    valorNovo: input,
    justificativa: input.justificativa,
    registradoPorId: session.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Utilitário: usuário pode aprovar?
// ---------------------------------------------------------------------------

export async function podeAprovarOrcamento(): Promise<boolean> {
  return temPermissao(PERMISSOES.ORCAMENTO_APROVAR);
}

export async function podeGerenciarJornada(): Promise<boolean> {
  return temPermissao(PERMISSOES.ORCAMENTO_GERENCIAR_JORNADA);
}
