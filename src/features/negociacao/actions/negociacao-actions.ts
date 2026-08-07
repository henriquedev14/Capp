"use server";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { revalidatePath } from "next/cache";
import { mudarStatusEmpreendimento } from "@/features/empreendimentos/actions/empreendimento-actions";
import { buscarTodasCotacoesDetalhadas } from "@/features/cotacoes/actions/buscar-todas-detalhadas";

/**
 * Busca a Rodada de Cotação mais recente do empreendimento (a que foi
 * enviada ao cliente pra negociar) — usada na tela de Negociação.
 * Resolve o Achado #3 da investigação de fluxo (07/08/2026).
 */
export async function buscarDadosNegociacao(empreendimentoId: string) {
  const orcamento = await prisma.orcamento.findFirst({
    where: { empreendimentoId },
    orderBy: { revisao: "desc" },
    select: { id: true },
  });

  if (!orcamento) {
    return { cotacoes: [], historico: [] };
  }

  const [cotacoes, historico] = await Promise.all([
    buscarTodasCotacoesDetalhadas(orcamento.id, empreendimentoId),
    prisma.decisaoNegociacao.findMany({
      where: { empreendimentoId },
      include: { registradoPor: { select: { nome: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    cotacoes,
    historico: historico.map((h) => ({
      id: h.id,
      decisao: h.decisao,
      observacoes: h.observacoes,
      registradoPorNome: h.registradoPor?.nome ?? "—",
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

interface RegistrarDecisaoInput {
  empreendimentoId: string;
  decisao: "ACEITO" | "RECUSADO";
  cotacaoVencedoraId?: string;
  observacoes?: string;
}

/**
 * Registra a decisão do cliente na Negociação — alguém da HGI preenche
 * depois de falar com o cliente fora do sistema (ligação, e-mail).
 *
 * Se ACEITO: marca a Cotação vencedora como ACEITA, as outras da mesma
 * Rodada como RECUSADA, e avança o empreendimento pra Contratado
 * (reaproveita mudarStatusEmpreendimento, que já cuida de gerar a
 * Conta a Receber automática).
 *
 * Se RECUSADO: só registra o histórico — nada avança, cotação segue
 * livre pra ser revisada/gerar nova rodada.
 */
export async function registrarDecisaoCliente(input: RegistrarDecisaoInput): Promise<
  { ok: true } | { erro: string }
> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (input.decisao === "ACEITO" && !input.cotacaoVencedoraId) {
    return { erro: "Escolha qual fornecedor o cliente aceitou." };
  }

  await prisma.decisaoNegociacao.create({
    data: {
      empreendimentoId: input.empreendimentoId,
      decisao: input.decisao,
      cotacaoVencedoraId: input.cotacaoVencedoraId ?? null,
      observacoes: input.observacoes?.trim() || null,
      registradoPorId: sessao.user.id,
    },
  });

  if (input.decisao === "ACEITO" && input.cotacaoVencedoraId) {
    const cotacaoVencedora = await prisma.cotacao.findUnique({
      where: { id: input.cotacaoVencedoraId },
      select: { rodadaId: true, orcamentoId: true },
    });

    if (cotacaoVencedora?.rodadaId) {
      // Todas as cotações da mesma rodada — a vencedora vira ACEITA,
      // as outras (se houve mais de um fornecedor concorrendo) viram
      // RECUSADA automaticamente.
      await prisma.cotacao.updateMany({
        where: { rodadaId: cotacaoVencedora.rodadaId, id: { not: input.cotacaoVencedoraId } },
        data: { status: "RECUSADA" },
      });
    }
    await prisma.cotacao.update({
      where: { id: input.cotacaoVencedoraId },
      data: { status: "ACEITA" },
    });

    const resultado = await mudarStatusEmpreendimento(input.empreendimentoId, "CONTRATADO");
    if ("erro" in resultado) return resultado;
  }

  revalidatePath(`/empreendimentos/${input.empreendimentoId}/negociacao`);
  revalidatePath(`/empreendimentos/${input.empreendimentoId}`);
  revalidatePath(`/empreendimentos/${input.empreendimentoId}/orcamento`);

  return { ok: true };
}
