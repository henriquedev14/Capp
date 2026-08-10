"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { ehGestorSenior } from "@/infra/auth/eh-gestor-senior";
import { PERMISSOES } from "@/core/auth/permissions";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { renderizarPropostaPdf } from "@/features/orcamentacao/lib/renderizar-proposta";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";
import { verificarPodeGerarProposta } from "@/features/empreendimentos/lib/gates-status";

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
