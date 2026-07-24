"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { ehGestorSenior } from "@/infra/auth/eh-gestor-senior";
import { PERMISSOES } from "@/core/auth/permissions";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { renderizarPropostaPdf } from "@/features/orcamentacao/lib/renderizar-proposta";
import { criarContaReceberAutomatica } from "@/features/financeiro/lib/criar-conta-receber-automatica";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";
import { verificarPodeGerarProposta, verificarPropostaJaGerada } from "@/features/empreendimentos/lib/gates-status";

const timelineRepo = new TimelinePrismaRepository();

interface Resultado {
  erro?: string;
  ok?: boolean;
  documentoId?: string;
}

/**
 * Gera a proposta comercial em PDF, anexa como documento na timeline do
 * empreendimento, e TRAVA o orçamento (propostaGeradaEm preenchido).
 *
 * Regra de negócio: uma vez gerada, o botão de gerar vira consulta pra
 * qualquer papel. Só Diretor/Admin pode gerar de novo (sobrescrevendo a
 * trava) — verificado via ehGestorSenior(), não por permissão configurável,
 * porque essa é uma regra de "quebra de fluxo", não uma permissão comum.
 */
export async function gerarPropostaComercial(orcamentoId: string): Promise<Resultado> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const orcamento = await prisma.orcamento.findUnique({
    where: { id: orcamentoId },
    select: {
      id: true,
      status: true,
      revisao: true,
      propostaGeradaEm: true,
      empreendimentoId: true,
    },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };

  const guardaArquivado = await verificarEmpreendimentoAtivo(orcamento.empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  const podeSobrescrever = orcamento.propostaGeradaEm ? await ehGestorSenior() : true;
  const validacaoGeracao = verificarPodeGerarProposta(orcamento, podeSobrescrever);
  if (!validacaoGeracao.permitido) return { erro: validacaoGeracao.motivo! };

  const resultado = await renderizarPropostaPdf(orcamentoId, sessao.user.id);
  if ("erro" in resultado) return { erro: resultado.erro };

  const documento = await prisma.documentoEmpreendimento.create({
    data: {
      empreendimentoId: resultado.empreendimentoId,
      nome: resultado.nomeArquivo,
      url: "",
      conteudo: new Uint8Array(resultado.buffer),
      tamanho: resultado.buffer.length,
      tipo: "application/pdf",
      usuarioId: sessao.user.id,
    },
    select: { id: true },
  });

  await prisma.orcamento.update({
    where: { id: orcamentoId },
    data: {
      propostaGeradaEm: new Date(),
      propostaGeradaPorId: sessao.user.id,
      propostaDocumentoId: documento.id,
      // Regenerar reseta a decisão do cliente anterior — evita ficar com
      // "cliente aceitou" registrado sobre uma proposta que já não é a atual.
      decisaoCliente: "PENDENTE",
      decisaoClienteEm: null,
      decisaoClienteObs: null,
    },
  });

  await timelineRepo.criarEvento({
    empreendimentoId: resultado.empreendimentoId,
    tipo: "DOCUMENTO",
    titulo: `Proposta comercial gerada (rev. ${resultado.revisao})`,
    descricao: resultado.nomeArquivo,
    usuarioId: sessao.user.id,
    meta: JSON.stringify({ documentoId: documento.id, orcamentoId }),
  });

  // Avanço automático: gerar a proposta é o que autoriza entrar em
  // Negociação (essa era a trava manual que existia antes) — então, em vez
  // de esperar alguém clicar "Avançar" à parte, já empurra o status sozinho.
  // Só avança se ainda estiver em ORCAMENTACAO — não mexe se o
  // empreendimento já estiver mais adiante (Contratado, etc.) por algum
  // motivo (ex: proposta sendo regenerada por Diretor/Admin depois).
  const empreendimentoAtual = await prisma.empreendimento.findUnique({
    where: { id: resultado.empreendimentoId },
    select: { status: true },
  });
  if (empreendimentoAtual?.status === "ORCAMENTACAO") {
    await prisma.empreendimento.update({
      where: { id: resultado.empreendimentoId },
      data: { status: "NEGOCIACAO" },
    });
    await timelineRepo.criarEvento({
      empreendimentoId: resultado.empreendimentoId,
      tipo: "MUDANCA_STATUS",
      titulo: "Avançou para Negociação automaticamente",
      descricao: "Proposta comercial gerada — empreendimento liberado para negociação com o cliente.",
      usuarioId: sessao.user.id,
    });
  }

  revalidatePath(`/empreendimentos/${resultado.empreendimentoId}/orcamento`);
  revalidatePath(`/empreendimentos/${resultado.empreendimentoId}`);

  return { ok: true, documentoId: documento.id };
}

/**
 * Registra a decisão do cliente sobre a proposta gerada (aceitou/recusou).
 * Isso é preenchido manualmente pelo Comercial depois de conversar com o
 * cliente — o sistema não tem portal do cliente, então não há como capturar
 * isso automaticamente.
 */
export async function registrarDecisaoCliente(
  orcamentoId: string,
  decisao: "ACEITA" | "RECUSADA",
  observacao?: string
): Promise<Resultado> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const orcamento = await prisma.orcamento.findUnique({
    where: { id: orcamentoId },
    select: { propostaGeradaEm: true, empreendimentoId: true, revisao: true },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };
  const validacaoProposta = verificarPropostaJaGerada(orcamento);
  if (!validacaoProposta.permitido) return { erro: validacaoProposta.motivo! };

  const guardaArquivado = await verificarEmpreendimentoAtivo(orcamento.empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  await prisma.orcamento.update({
    where: { id: orcamentoId },
    data: {
      decisaoCliente: decisao,
      decisaoClienteEm: new Date(),
      decisaoClienteObs: observacao ?? null,
    },
  });

  await timelineRepo.criarEvento({
    empreendimentoId: orcamento.empreendimentoId,
    tipo: "ANOTACAO",
    titulo:
      decisao === "ACEITA"
        ? `Cliente aceitou a proposta (rev. ${orcamento.revisao})`
        : `Cliente recusou a proposta (rev. ${orcamento.revisao})`,
    descricao: observacao || undefined,
    usuarioId: sessao.user.id,
  });

  // Avanço automático: cliente aceitando a proposta é o gatilho natural pra
  // fechar contrato — só avança se ainda estiver em NEGOCIACAO (não mexe se
  // já estiver em outro lugar por algum motivo).
  if (decisao === "ACEITA") {
    const empreendimentoAtual = await prisma.empreendimento.findUnique({
      where: { id: orcamento.empreendimentoId },
      select: { status: true },
    });
    if (empreendimentoAtual?.status === "NEGOCIACAO") {
      await prisma.empreendimento.update({
        where: { id: orcamento.empreendimentoId },
        data: { status: "CONTRATADO" },
      });
      await timelineRepo.criarEvento({
        empreendimentoId: orcamento.empreendimentoId,
        tipo: "MUDANCA_STATUS",
        titulo: "Avançou para Contratado automaticamente",
        descricao: "Cliente aceitou a proposta — negociação concluída.",
        usuarioId: sessao.user.id,
      });
      await criarContaReceberAutomatica(orcamento.empreendimentoId);
    }
  }

  revalidatePath(`/empreendimentos/${orcamento.empreendimentoId}/orcamento`);
  revalidatePath(`/empreendimentos/${orcamento.empreendimentoId}`);
  return { ok: true };
}
