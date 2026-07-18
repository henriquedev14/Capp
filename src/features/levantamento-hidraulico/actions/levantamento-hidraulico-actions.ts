"use server";

import { revalidatePath } from "next/cache";
import { LevantamentoHidraulicoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-hidraulico-prisma-repository";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { SubtipoHidraulico } from "@/core/empreendimentos/entities/levantamento-hidraulico";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

const repo = new LevantamentoHidraulicoPrismaRepository();
const timelineRepo = new TimelinePrismaRepository();

function revalidar(empreendimentoId: string) {
  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  revalidatePath(`/empreendimentos/${empreendimentoId}/levantamento-hidraulico`);
}

const LABEL_SUBTIPO: Record<SubtipoHidraulico, string> = {
  PEX: "PEX",
  AGUA_FRIA: "Água Fria",
  AGUA_QUENTE: "Água Quente",
  ESGOTO: "Esgoto",
};

export async function abrirOuCriarLevantamentoHidraulico(
  empreendimentoId: string,
  tipologiaId: string,
  subtipo: SubtipoHidraulico
): Promise<{ id: string } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    const lev = await repo.criarOuBuscar(empreendimentoId, tipologiaId, subtipo, sessao.user.id);
    // Log de inserção — só registra na primeira criação (RASCUNHO vazio, sem itens)
    if (lev.itens.length === 0) {
      await timelineRepo.criarEvento({
        empreendimentoId,
        tipo: "DOCUMENTO",
        titulo: `Levantamento Hidráulico (${LABEL_SUBTIPO[subtipo]}) iniciado`,
        descricao: `Tipologia: ${lev.tipologiaNome ?? ""}`,
        usuarioId: sessao.user.id,
      });
    }
    return { id: lev.id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao abrir levantamento." };
  }
}

export async function adicionarItemHidraulico(
  empreendimentoId: string,
  levantamentoId: string,
  data: {
    materialPexId?: string | null;
    descricao: string;
    categoria?: string | null;
    diametro?: string | null;
    unidade: string;
    quantidade: number;
  }
): Promise<{ id: string } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    const item = await repo.adicionarItem(levantamentoId, {
      materialPexId: data.materialPexId ?? null,
      descricao: data.descricao,
      categoria: data.categoria ?? null,
      diametro: data.diametro ?? null,
      unidade: data.unidade,
      quantidade: data.quantidade,
    });
    revalidar(empreendimentoId);
    return { id: item.id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao adicionar item." };
  }
}

export async function excluirItemHidraulico(
  empreendimentoId: string,
  itemId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.excluirItem(itemId);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao excluir item." };
  }
}

export async function validarLevantamentoHidraulico(
  empreendimentoId: string,
  levantamentoId: string,
  subtipo: SubtipoHidraulico,
  tipologiaNome: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    // Validação do levantamento hidráulico (PEX e demais subtipos) exige
    // aval de um gestor (Diretor/Coordenador) — mesma permissão usada para
    // aprovar propostas comerciais, já que valida os números que vão para
    // a orçamentação.
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_APROVAR_PROPOSTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado — só um Diretor ou Coordenador pode validar este levantamento." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.validar(levantamentoId);
    await timelineRepo.criarEvento({
      empreendimentoId,
      tipo: "DOCUMENTO",
      titulo: `Levantamento Hidráulico (${LABEL_SUBTIPO[subtipo]}) validado`,
      descricao: `Tipologia: ${tipologiaNome}`,
      usuarioId: sessao.user.id,
    });
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao validar." };
  }
}

export async function voltarParaRascunhoHidraulico(
  empreendimentoId: string,
  levantamentoId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  try {
    await repo.voltarParaRascunho(levantamentoId);
    revalidar(empreendimentoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao reverter." };
  }
}
