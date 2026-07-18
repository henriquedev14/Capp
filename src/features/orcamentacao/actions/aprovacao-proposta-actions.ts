"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { LevantamentoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-prisma-repository";
import { LevantamentoHidraulicoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-hidraulico-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { exigirPermissao, temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

const timelineRepo = new TimelinePrismaRepository();
const levantamentoRepo = new LevantamentoPrismaRepository();
const levantamentoHidraulicoRepo = new LevantamentoHidraulicoPrismaRepository();
const estruturaRepo = new EstruturaFisicaPrismaRepository();
const empreendimentoRepo = new EmpreendimentoPrismaRepository();

export interface StatusAprovacao {
  aprovado: boolean;
  obsoleto: boolean; // levantamento foi revalidado depois do aval — precisa de novo aval
  aprovadoPorNome?: string;
  aprovadoEm?: Date;
  podeAprovar: boolean;
  temLevantamentoEletricoValidado: boolean;
  temLevantamentoHidraulicoValidado: boolean;
  // Regra: com mais de uma tipologia no empreendimento, só é possível
  // gerar proposta depois que TODAS as tipologias tiverem os
  // levantamentos dos kits contratados validados — evita propostas
  // parciais/inconsistentes quando o empreendimento tem várias tipologias.
  multiTipologia: boolean;
  todasTipologiasProntas: boolean;
  tipologiasPendentes: string[];
}

/**
 * Verifica, para CADA tipologia do empreendimento, se os levantamentos dos
 * kits contratados (elétrico/hidráulico) estão validados. Usado para a
 * trava de "proposta só depois de tudo pronto" quando há mais de uma
 * tipologia.
 */
async function verificarTodasTipologiasProntas(empreendimentoId: string) {
  const [empreendimento, tipologias, levsHidraulicos] = await Promise.all([
    empreendimentoRepo.findById(empreendimentoId),
    estruturaRepo.buscarTipologias(empreendimentoId),
    levantamentoHidraulicoRepo.buscarTodosPorEmpreendimento(empreendimentoId),
  ]);

  const multiTipologia = tipologias.length > 1;
  if (!multiTipologia || !empreendimento) {
    return { multiTipologia, todasProntas: true, pendentes: [] as string[] };
  }

  const pendentes: string[] = [];

  for (const tipologia of tipologias) {
    let pronta = true;

    if (empreendimento.kitEletrico) {
      const lev = await levantamentoRepo.buscarPorTipologia(empreendimentoId, tipologia.id);
      if (lev?.status !== "VALIDADO") pronta = false;
    }
    if (empreendimento.kitHidraulico) {
      const temHidraulicoValidado = levsHidraulicos.some(
        (l) => l.tipologiaId === tipologia.id && l.status === "VALIDADO"
      );
      if (!temHidraulicoValidado) pronta = false;
    }

    if (!pronta) pendentes.push(tipologia.nome);
  }

  return { multiTipologia, todasProntas: pendentes.length === 0, pendentes };
}

/**
 * Verifica o status de aprovação de uma tipologia para geração de
 * proposta. Considera o aval "obsoleto" se qualquer levantamento
 * (elétrico ou hidráulico) daquela tipologia foi validado DEPOIS do
 * último aval registrado — força um novo aval sempre que os números
 * mudarem.
 */
export async function buscarStatusAprovacao(
  empreendimentoId: string,
  tipologiaId: string
): Promise<StatusAprovacao> {
  const [ultimaAprovacao, levEletrico, levsHidraulicos, podeAprovar, checagemMulti] = await Promise.all([
    prisma.aprovacaoProposta.findFirst({
      where: { empreendimentoId, tipologiaId },
      orderBy: { createdAt: "desc" },
      include: { aprovadoPor: { select: { nome: true } } },
    }),
    levantamentoRepo.buscarPorTipologia(empreendimentoId, tipologiaId),
    levantamentoHidraulicoRepo.buscarTodosPorEmpreendimento(empreendimentoId),
    temPermissao(PERMISSOES.EMPREENDIMENTO_APROVAR_PROPOSTA),
    verificarTodasTipologiasProntas(empreendimentoId),
  ]);

  const levHidraulicosDaTipologia = levsHidraulicos.filter((l) => l.tipologiaId === tipologiaId);
  const temEletricoValidado = levEletrico?.status === "VALIDADO";
  const temHidraulicoValidado = levHidraulicosDaTipologia.some((l) => l.status === "VALIDADO");

  const base = {
    podeAprovar,
    temLevantamentoEletricoValidado: temEletricoValidado,
    temLevantamentoHidraulicoValidado: temHidraulicoValidado,
    multiTipologia: checagemMulti.multiTipologia,
    todasTipologiasProntas: checagemMulti.todasProntas,
    tipologiasPendentes: checagemMulti.pendentes,
  };

  if (!ultimaAprovacao) {
    return { aprovado: false, obsoleto: false, ...base };
  }

  // Verifica se algum levantamento foi revalidado depois do aval
  const dataAprovacao = ultimaAprovacao.createdAt;
  const eletricoRevalidadoDepois =
    temEletricoValidado && levEletrico!.updatedAt > dataAprovacao;
  const hidraulicoRevalidadoDepois = levHidraulicosDaTipologia.some(
    (l) => l.status === "VALIDADO" && l.updatedAt > dataAprovacao
  );

  return {
    aprovado: true,
    obsoleto: eletricoRevalidadoDepois || hidraulicoRevalidadoDepois,
    aprovadoPorNome: ultimaAprovacao.aprovadoPor.nome,
    aprovadoEm: ultimaAprovacao.createdAt,
    ...base,
  };
}

export async function aprovarProposta(
  empreendimentoId: string,
  tipologiaId: string,
  tipologiaNome: string,
  observacao?: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_APROVAR_PROPOSTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  // Confere que existe pelo menos um levantamento validado antes de aprovar
  const levEletrico = await levantamentoRepo.buscarPorTipologia(empreendimentoId, tipologiaId);
  const levsHidraulicos = await levantamentoHidraulicoRepo.buscarTodosPorEmpreendimento(empreendimentoId);
  const temValidado =
    levEletrico?.status === "VALIDADO" ||
    levsHidraulicos.some((l) => l.tipologiaId === tipologiaId && l.status === "VALIDADO");

  if (!temValidado) {
    return { erro: "Nenhum levantamento validado para esta tipologia ainda." };
  }

  try {
    await prisma.aprovacaoProposta.create({
      data: {
        empreendimentoId,
        tipologiaId,
        aprovadoPorId: sessao.user.id,
        observacao: observacao || null,
      },
    });

    await timelineRepo.criarEvento({
      empreendimentoId,
      tipo: "ANOTACAO",
      titulo: "Proposta comercial aprovada",
      descricao: `Tipologia: ${tipologiaNome}. Aval dado por ${sessao.user.nome}.`,
      usuarioId: sessao.user.id,
    });

    revalidatePath(`/empreendimentos/${empreendimentoId}`);
    revalidatePath(`/empreendimentos/${empreendimentoId}/levantamento`);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao registrar aval." };
  }
}
