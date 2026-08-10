"use server";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { revalidatePath } from "next/cache";
import { buscarTodasCotacoesDetalhadas } from "@/features/cotacoes/actions/buscar-todas-detalhadas";
import { proximoNumeroContrato } from "@/features/negociacao/lib/numero-contrato";
import { criarContaReceberAutomatica } from "@/features/financeiro/lib/criar-conta-receber-automatica";
import {
  derivarStatusNegociacao,
  calcularPrioridade,
  type StatusNegociacao,
  type PrioridadeNegociacao,
} from "@/core/negociacao/use-cases/status-negociacao";

export interface LinhaHubNegociacao {
  empreendimentoId: string;
  nome: string;
  clienteNome: string;
  status: StatusNegociacao;
  prioridade: PrioridadeNegociacao;
  valorAtual: number;
  valorOriginal: number;
  responsavelNome: string;
  diasSemInteracao: number;
  followUpVencido: boolean;
  proximaAcao: string | null;
  proximaAcaoData: string | null;
}

export async function buscarHubNegociacoes(): Promise<LinhaHubNegociacao[]> {
  const empreendimentos = await prisma.empreendimento.findMany({
    where: { excluidoEm: null, status: "NEGOCIACAO" },
    select: {
      id: true,
      nome: true,
      cliente: { select: { razaoSocial: true, nomeFantasia: true } },
      responsavelComercialUser: { select: { nome: true } },
      orcamentos: {
        orderBy: { revisao: "desc" },
        take: 1,
        select: { totalMateriais: true, totalServicosHgi: true },
      },
      interacoesNegociacao: {
        orderBy: { createdAt: "desc" },
        select: { tipo: true, createdAt: true, proximaAcaoData: true, valorNegociado: true, proximaAcao: true },
      },
    },
  });

  return empreendimentos.map((e) => {
    const status = derivarStatusNegociacao(e.interacoesNegociacao);
    const { prioridade, diasSemInteracao, followUpVencido, proximaAcaoData } = calcularPrioridade(
      e.interacoesNegociacao
    );

    const valorOriginal = Number(e.orcamentos[0]?.totalMateriais ?? 0) + Number(e.orcamentos[0]?.totalServicosHgi ?? 0);
    const ultimaComValor = e.interacoesNegociacao.find((i) => i.valorNegociado != null);
    const valorAtual = ultimaComValor?.valorNegociado != null ? Number(ultimaComValor.valorNegociado) : valorOriginal;

    const ultima = e.interacoesNegociacao[0];

    return {
      empreendimentoId: e.id,
      nome: e.nome,
      clienteNome: e.cliente.nomeFantasia ?? e.cliente.razaoSocial,
      status,
      prioridade,
      valorAtual,
      valorOriginal,
      responsavelNome: e.responsavelComercialUser?.nome ?? "—",
      diasSemInteracao,
      followUpVencido,
      proximaAcao: ultima?.proximaAcao ?? null,
      proximaAcaoData: proximaAcaoData ? proximaAcaoData.toISOString() : null,
    };
  });
}

export interface InteracaoTimeline {
  id: string;
  tipo: string;
  valorNegociado: number | null;
  motivoPerda: string | null;
  observacoes: string | null;
  proximaAcao: string | null;
  proximaAcaoData: string | null;
  registradoPorNome: string;
  createdAt: string;
}

export async function buscarDadosNegociacao(empreendimentoId: string) {
  const orcamento = await prisma.orcamento.findFirst({
    where: { empreendimentoId },
    orderBy: { revisao: "desc" },
    select: { id: true, totalMateriais: true, totalServicosHgi: true },
  });

  const [cotacoes, interacoesRaw] = await Promise.all([
    orcamento ? buscarTodasCotacoesDetalhadas(orcamento.id, empreendimentoId) : Promise.resolve([]),
    prisma.interacaoNegociacao.findMany({
      where: { empreendimentoId },
      include: { registradoPor: { select: { nome: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const valorOriginal = Number(orcamento?.totalMateriais ?? 0) + Number(orcamento?.totalServicosHgi ?? 0);
  const status = derivarStatusNegociacao(interacoesRaw);
  const prioridadeInfo = calcularPrioridade(interacoesRaw);
  const ultimaComValor = interacoesRaw.find((i) => i.valorNegociado != null);
  const valorAtual = ultimaComValor?.valorNegociado != null ? Number(ultimaComValor.valorNegociado) : valorOriginal;

  const interacoes: InteracaoTimeline[] = interacoesRaw.map((i) => ({
    id: i.id,
    tipo: i.tipo,
    valorNegociado: i.valorNegociado != null ? Number(i.valorNegociado) : null,
    motivoPerda: i.motivoPerda,
    observacoes: i.observacoes,
    proximaAcao: i.proximaAcao,
    proximaAcaoData: i.proximaAcaoData ? i.proximaAcaoData.toISOString() : null,
    registradoPorNome: i.registradoPor?.nome ?? "Sistema",
    createdAt: i.createdAt.toISOString(),
  }));

  return { cotacoes, interacoes, status, valorOriginal, valorAtual, ...prioridadeInfo };
}

interface RegistrarInteracaoInput {
  empreendimentoId: string;
  tipo: "CONTATO" | "CONTRAPROPOSTA" | "PERDIDA" | "RETORNO_ENGENHARIA";
  valorNegociado?: number;
  motivoPerda?: string;
  observacoes?: string;
  proximaAcao?: string;
  proximaAcaoData?: string;
}

export async function registrarInteracao(input: RegistrarInteracaoInput): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (input.tipo === "PERDIDA" && !input.motivoPerda) {
    return { erro: "Escolha o motivo da recusa." };
  }

  await prisma.interacaoNegociacao.create({
    data: {
      empreendimentoId: input.empreendimentoId,
      tipo: input.tipo,
      valorNegociado: input.valorNegociado ?? null,
      motivoPerda: input.motivoPerda ?? null,
      observacoes: input.observacoes?.trim() || null,
      proximaAcao: input.proximaAcao?.trim() || null,
      proximaAcaoData: input.proximaAcaoData ? new Date(input.proximaAcaoData) : null,
      registradoPorId: sessao.user.id,
    },
  });

  if (input.tipo === "RETORNO_ENGENHARIA") {
    await prisma.empreendimento.update({
      where: { id: input.empreendimentoId },
      data: { status: "ORCAMENTACAO" },
    });
    const orcamentoAtual = await prisma.orcamento.findFirst({
      where: { empreendimentoId: input.empreendimentoId },
      orderBy: { revisao: "desc" },
      select: { id: true },
    });
    if (orcamentoAtual) {
      await prisma.orcamento.update({
        where: { id: orcamentoAtual.id },
        data: { statusAprovacao: "NAO_ENVIADO", propostaGeradaEm: null },
      });
    }
  }

  revalidatePath(`/empreendimentos/${input.empreendimentoId}/negociacao`);
  revalidatePath(`/empreendimentos/${input.empreendimentoId}/orcamento`);
  revalidatePath("/negociacao");
  revalidatePath("/orcamentacao");

  return { ok: true };
}

export interface DadosConfirmacaoContrato {
  clienteRazaoSocial: string;
  clienteCnpj: string;
  clienteEndereco: string | null;
  clienteCidade: string | null;
  clienteEstado: string | null;
  empresasGrupo: { id: string; nome: string }[];
  cotacoesAtivas: { id: string; fornecedorNome: string; totalGeral: number }[];
  valorAtual: number;
}

export async function buscarDadosConfirmacaoContrato(
  empreendimentoId: string
): Promise<DadosConfirmacaoContrato | { erro: string }> {
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: {
      cliente: {
        select: { razaoSocial: true, cnpj: true, logradouro: true, cidade: true, estado: true },
      },
    },
  });
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };

  const orcamento = await prisma.orcamento.findFirst({
    where: { empreendimentoId },
    orderBy: { revisao: "desc" },
    select: {
      id: true,
      totalMateriais: true,
      totalServicosHgi: true,
      cotacoes: {
        where: { status: { in: ["ENVIADA", "RESPONDIDA"] } },
        include: { fornecedor: { select: { razaoSocial: true, nomeFantasia: true } } },
      },
    },
  });

  const [empresasGrupo, interacoes] = await Promise.all([
    prisma.empresaGrupo.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.interacaoNegociacao.findMany({
      where: { empreendimentoId, valorNegociado: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { valorNegociado: true },
    }),
  ]);

  const valorOriginal = Number(orcamento?.totalMateriais ?? 0) + Number(orcamento?.totalServicosHgi ?? 0);
  const valorAtual = interacoes[0]?.valorNegociado != null ? Number(interacoes[0].valorNegociado) : valorOriginal;

  return {
    clienteRazaoSocial: empreendimento.cliente.razaoSocial,
    clienteCnpj: empreendimento.cliente.cnpj,
    clienteEndereco: empreendimento.cliente.logradouro,
    clienteCidade: empreendimento.cliente.cidade,
    clienteEstado: empreendimento.cliente.estado,
    empresasGrupo,
    cotacoesAtivas: (orcamento?.cotacoes ?? []).map((c) => ({
      id: c.id,
      fornecedorNome: c.fornecedor.nomeFantasia ?? c.fornecedor.razaoSocial,
      totalGeral: Number(c.totalGeral ?? 0),
    })),
    valorAtual,
  };
}

interface RegistrarGanhaInput {
  empreendimentoId: string;
  cotacaoVencedoraId?: string;
  observacoes?: string;
  empresaGrupoId: string;
  clienteRazaoSocial: string;
  clienteCnpj: string;
  clienteEndereco?: string;
  clienteCidade?: string;
  clienteEstado?: string;
  valorFinal: number;
}

export async function registrarGanhaEGerarContrato(
  input: RegistrarGanhaInput
): Promise<{ ok: true; contratoId: string } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!input.empresaGrupoId) return { erro: "Escolha qual Empresa do Grupo é responsável." };
  if (!input.clienteRazaoSocial.trim() || !input.clienteCnpj.trim()) {
    return { erro: "Confirme os dados do cliente antes de gerar o contrato." };
  }

  await prisma.interacaoNegociacao.create({
    data: {
      empreendimentoId: input.empreendimentoId,
      tipo: "GANHA",
      valorNegociado: input.valorFinal,
      cotacaoVencedoraId: input.cotacaoVencedoraId ?? null,
      observacoes: input.observacoes?.trim() || null,
      registradoPorId: sessao.user.id,
    },
  });

  if (input.cotacaoVencedoraId) {
    const cotacaoVencedora = await prisma.cotacao.findUnique({
      where: { id: input.cotacaoVencedoraId },
      select: { rodadaId: true },
    });
    if (cotacaoVencedora?.rodadaId) {
      await prisma.cotacao.updateMany({
        where: { rodadaId: cotacaoVencedora.rodadaId, id: { not: input.cotacaoVencedoraId } },
        data: { status: "RECUSADA" },
      });
    }
    await prisma.cotacao.update({ where: { id: input.cotacaoVencedoraId }, data: { status: "ACEITA" } });
  }

  await prisma.empreendimento.update({
    where: { id: input.empreendimentoId },
    data: { status: "CONTRATADO" },
  });

  // Só nasce a Conta a Receber quando o cliente REALMENTE aceitou — antes
  // existia um código velho (removido em 09/08/2026) que disparava isso
  // já na geração da Proposta, achando que "gerou proposta em Negociação"
  // significava "cliente aceitou". Agora só acontece aqui, no fluxo real
  // de Ganha, junto com o Contrato.
  await criarContaReceberAutomatica(input.empreendimentoId);

  const numero = await proximoNumeroContrato();
  const contrato = await prisma.contrato.create({
    data: {
      numero,
      empreendimentoId: input.empreendimentoId,
      empresaGrupoId: input.empresaGrupoId,
      clienteRazaoSocial: input.clienteRazaoSocial.trim(),
      clienteCnpj: input.clienteCnpj.trim(),
      clienteEndereco: input.clienteEndereco?.trim() || null,
      clienteCidade: input.clienteCidade?.trim() || null,
      clienteEstado: input.clienteEstado?.trim() || null,
      valorFinal: input.valorFinal,
      geradoPorId: sessao.user.id,
    },
    select: { id: true },
  });

  revalidatePath(`/empreendimentos/${input.empreendimentoId}/negociacao`);
  revalidatePath(`/empreendimentos/${input.empreendimentoId}`);
  revalidatePath("/negociacao");

  return { ok: true, contratoId: contrato.id };
}
