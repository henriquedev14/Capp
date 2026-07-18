"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES, type PermissaoChave } from "@/core/auth/permissions";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { verificarGateOrcamentacao, verificarGateNegociacao } from "@/features/empreendimentos/lib/gates-status";
import type { Empreendimento } from "@/core/empreendimentos/entities/empreendimento";
import { verificarEmpreendimentoNaoArquivado } from "@/core/empreendimentos/use-cases/guarda-empreendimento-arquivado";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

type StatusEmp = Empreendimento["status"];

const timelineRepo = new TimelinePrismaRepository();

type Area = "COMERCIAL" | "ENGENHARIA" | "ORCAMENTACAO";

const CAMPO_RESPONSAVEL: Record<Area, string> = {
  COMERCIAL: "responsavelComercialUserId",
  ENGENHARIA: "responsavelEngenhariaUserId",
  ORCAMENTACAO: "responsavelOrcamentacaoUserId",
};

const CAMPO_CONCLUIDO: Record<Area, string> = {
  COMERCIAL: "comercialConcluidoEm",
  ENGENHARIA: "engenhariaConcluidaEm",
  ORCAMENTACAO: "orcamentacaoConcluidaEm",
};

const LABEL_AREA: Record<Area, string> = {
  COMERCIAL: "Comercial",
  ENGENHARIA: "Engenharia",
  ORCAMENTACAO: "Orçamentação",
};

const PERMISSAO_AREA: Record<Area, PermissaoChave> = {
  COMERCIAL: PERMISSOES.RESPONSABILIDADE_COMERCIAL,
  ENGENHARIA: PERMISSOES.RESPONSABILIDADE_ENGENHARIA,
  ORCAMENTACAO: PERMISSOES.RESPONSABILIDADE_ORCAMENTACAO,
};

/**
 * Assume a responsabilidade por uma área do empreendimento — restrito a
 * quem tem a permissão daquela área específica (antes, qualquer pessoa
 * com acesso de visualização podia assumir qualquer etapa, mesmo sendo
 * de outro setor — ex: Financeiro assumindo a etapa Comercial). Fica
 * registrado na Timeline pra rastreabilidade de quem pegou o quê e quando.
 */
export async function assumirResponsabilidade(
  empreendimentoId: string,
  area: Area
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSAO_AREA[area]);
  } catch (e) {
    return {
      erro: `Você não tem permissão para atuar na área de ${LABEL_AREA[area]}. Peça pro Admin liberar isso no seu papel, se fizer sentido.`,
    };
  }

  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { [CAMPO_RESPONSAVEL[area]]: sessao.user.id },
  });

  await timelineRepo.criarEvento({
    empreendimentoId,
    tipo: "ANOTACAO",
    titulo: `${sessao.user.nome} assumiu a responsabilidade de ${LABEL_AREA[area]}`,
    usuarioId: sessao.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  return { ok: true };
}

export async function liberarResponsabilidade(
  empreendimentoId: string,
  area: Area
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_VER);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  // Mesma regra do "assumir": só quem tem a permissão daquela área, OU um
  // gestor (que pode precisar liberar uma etapa travada mesmo sem ser da
  // área específica).
  const temPermissaoArea = sessao.user.permissoes.includes(PERMISSAO_AREA[area]);
  const ehGestor = sessao.user.papeis.some((p) =>
    ["diretor", "admin", "coordenador"].some((termo) =>
      p
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .includes(termo)
    )
  );
  if (!temPermissaoArea && !ehGestor) {
    return {
      erro: `Você não tem permissão para atuar na área de ${LABEL_AREA[area]}. Peça pro Admin liberar isso no seu papel, se fizer sentido.`,
    };
  }

  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { [CAMPO_RESPONSAVEL[area]]: null },
  });

  await timelineRepo.criarEvento({
    empreendimentoId,
    tipo: "ANOTACAO",
    titulo: `${sessao.user.nome} liberou a responsabilidade de ${LABEL_AREA[area]}`,
    usuarioId: sessao.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  return { ok: true };
}

/**
 * Conclusão genérica de etapa — cada área tem sua própria regra de gate e
 * de qual transição de status dispara (ver funções específicas abaixo).
 * Centralizada aqui pra não duplicar a checagem "só quem é responsável
 * pode concluir" três vezes.
 */
async function concluirEtapaBase(
  empreendimentoId: string,
  area: Area,
  transicao: { statusEsperado: StatusEmp; novoStatus: StatusEmp; gate?: () => Promise<{ ok: true } | { erro: string }> }
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_VER);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: {
      status: true,
      responsavelComercialUserId: true,
      responsavelEngenhariaUserId: true,
      responsavelOrcamentacaoUserId: true,
      excluidoEm: true,
    },
  });
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };
  const guardaArquivado = verificarEmpreendimentoNaoArquivado(empreendimento);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  const responsavelAtual = (empreendimento as Record<string, unknown>)[CAMPO_RESPONSAVEL[area]];
  const ehGestor = sessao.user.papeis.some((p) =>
    ["diretor", "admin", "coordenador"].some((termo) =>
      p
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .includes(termo)
    )
  );
  if (responsavelAtual !== sessao.user.id && !ehGestor) {
    return { erro: "Só quem está responsável por essa etapa (ou um gestor) pode concluí-la." };
  }

  if (empreendimento.status !== transicao.statusEsperado) {
    return {
      erro: `Essa etapa só pode ser concluída quando o empreendimento está em "${transicao.statusEsperado}" — status atual: "${empreendimento.status}".`,
    };
  }
  if (transicao.gate) {
    const gate = await transicao.gate();
    if ("erro" in gate) return gate;
  }

  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: {
      [CAMPO_CONCLUIDO[area]]: new Date(),
      status: transicao.novoStatus,
    },
  });

  await timelineRepo.criarEvento({
    empreendimentoId,
    tipo: "MUDANCA_STATUS",
    titulo: `${sessao.user.nome} concluiu a etapa de ${LABEL_AREA[area]} — avançou para ${transicao.novoStatus}`,
    usuarioId: sessao.user.id,
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  revalidatePath("/painel");
  return { ok: true };
}

export async function concluirEtapaComercial(empreendimentoId: string) {
  return concluirEtapaBase(empreendimentoId, "COMERCIAL", {
    statusEsperado: "PROSPECCAO",
    novoStatus: "COMERCIAL",
  });
}

export async function concluirEtapaEngenharia(empreendimentoId: string) {
  return concluirEtapaBase(empreendimentoId, "ENGENHARIA", {
    statusEsperado: "COMERCIAL",
    novoStatus: "ORCAMENTACAO",
  });
}

export async function concluirEtapaOrcamentacao(empreendimentoId: string) {
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: { kitEletrico: true, kitHidraulico: true },
  });
  return concluirEtapaBase(empreendimentoId, "ORCAMENTACAO", {
    statusEsperado: "ORCAMENTACAO",
    novoStatus: "NEGOCIACAO",
    gate: async () => {
      const gateLevantamentos = await verificarGateOrcamentacao(
        empreendimentoId,
        empreendimento?.kitEletrico ?? false,
        empreendimento?.kitHidraulico ?? false
      );
      if ("erro" in gateLevantamentos) return gateLevantamentos;
      return verificarGateNegociacao(empreendimentoId);
    },
  });
}
