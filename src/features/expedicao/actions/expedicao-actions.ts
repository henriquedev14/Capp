"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { randomUUID } from "node:crypto";

import { authOptions } from "@/infra/auth/auth-options.full";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { prisma } from "@/infra/db/prisma/client";
import { comIdempotencia, ChaveIdempotenciaConflitante } from "@/infra/db/idempotencia";
import * as repo from "@/infra/db/prisma/repositories/expedicao-prisma-repository";
import type { ItemRemessaInput } from "@/infra/db/prisma/repositories/expedicao-prisma-repository";
import { verificarEmpreendimentoNaoArquivado } from "@/core/empreendimentos/use-cases/guarda-empreendimento-arquivado";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

type Resultado<T = { ok: true }> = T | { erro: string };

function tratarErro(e: unknown): { erro: string } {
  if (e instanceof ChaveIdempotenciaConflitante) return { erro: e.message };
  if (e instanceof Error) {
    // Erro de serialização do Postgres (conflito de transação concorrente)
    if ("code" in e && (e as { code?: string }).code === "40001") {
      return { erro: "Outra operação concorrente reservou esse saldo simultaneamente. Tente de novo." };
    }
    return { erro: e.message };
  }
  return { erro: "Erro inesperado." };
}

/**
 * [CORREÇÃO C2/C3.1-B] Decisão congelada: Expedição também exige
 * empreendimento restaurado pra continuar qualquer operação, mesmo sobre
 * uma Remessa já existente (criada antes do arquivamento).
 */
async function guardaArquivadoPorRemessa(remessaId: string): Promise<{ erro: string } | null> {
  const remessa = await prisma.remessa.findUnique({ where: { id: remessaId }, select: { empreendimentoId: true } });
  if (!remessa) return { erro: "Remessa não encontrada." };
  const guarda = await verificarEmpreendimentoAtivo(remessa.empreendimentoId);
  if (!guarda.permitido) return { erro: guarda.motivo! };
  return null;
}

async function guardaArquivadoPorItemRemessa(itemRemessaId: string): Promise<{ erro: string } | null> {
  const item = await prisma.itemRemessa.findUnique({
    where: { id: itemRemessaId },
    select: { remessa: { select: { empreendimentoId: true } } },
  });
  if (!item) return { erro: "Item da remessa não encontrado." };
  const guarda = await verificarEmpreendimentoAtivo(item.remessa.empreendimentoId);
  if (!guarda.permitido) return { erro: guarda.motivo! };
  return null;
}

// ---------------------------------------------------------------------------
// Remessa
// ---------------------------------------------------------------------------

export async function criarRemessaAction(input: {
  empresaId: string;
  clienteId: string;
  empreendimentoId: string;
  origem?: string;
  torreId?: string;
  pavimentoId?: string;
  etapa?: string;
  enderecoEntrega: string;
  dataSaidaPrevista?: string;
  dataEntregaPrevista?: string;
  observacoes?: string;
  itens: ItemRemessaInput[];
  idempotencyKey?: string;
}): Promise<Resultado<{ id: string; numero: string }>> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_CRIAR_REMESSA);

  if (input.itens.length === 0) return { erro: "Adicione ao menos um item à remessa." };
  if (!input.enderecoEntrega.trim()) return { erro: "Endereço de entrega é obrigatório." };

  // Validações cruzadas — cliente da remessa precisa bater com o cliente
  // do empreendimento, e cada tipologia precisa pertencer a esse empreendimento.
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: input.empreendimentoId },
    select: { clienteId: true, excluidoEm: true },
  });
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };
  const guardaArquivado = verificarEmpreendimentoNaoArquivado(empreendimento);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  if (empreendimento.clienteId !== input.clienteId) {
    return { erro: "Cliente da remessa não corresponde ao cliente do empreendimento." };
  }

  const tipologiasDoEmpreendimento = await prisma.tipologia.findMany({
    where: { empreendimentoId: input.empreendimentoId },
    select: { id: true },
  });
  const idsValidos = new Set(tipologiasDoEmpreendimento.map((t) => t.id));
  const tipologiaInvalida = input.itens.find((i) => !idsValidos.has(i.tipologiaId));
  if (tipologiaInvalida) {
    return { erro: `Tipologia "${tipologiaInvalida.tipologiaNome}" não pertence a este empreendimento.` };
  }

  const empresa = await prisma.empresaGrupo.findUnique({ where: { id: input.empresaId }, select: { ativo: true } });
  if (!empresa || !empresa.ativo) return { erro: "Empresa inválida ou inativa." };

  const chave = input.idempotencyKey ?? randomUUID();

  try {
    const { resultado } = await comIdempotencia(
      prisma,
      { empresaId: input.empresaId, operacao: "criar_remessa", chave, payload: input },
      async (tx) => {
        const remessa = await repo.criarRemessa(tx, {
          empresaId: input.empresaId,
          clienteId: input.clienteId,
          empreendimentoId: input.empreendimentoId,
          origem: input.origem,
          torreId: input.torreId,
          pavimentoId: input.pavimentoId,
          etapa: input.etapa,
          enderecoEntrega: input.enderecoEntrega,
          dataSaidaPrevista: input.dataSaidaPrevista ? new Date(input.dataSaidaPrevista) : null,
          dataEntregaPrevista: input.dataEntregaPrevista ? new Date(input.dataEntregaPrevista) : null,
          observacoes: input.observacoes,
          criadoPorId: session.user.id,
          itens: input.itens,
        });
        return { id: remessa.id, numero: remessa.numero };
      }
    );

    revalidatePath("/expedicao");
    return resultado;
  } catch (e) {
    return tratarErro(e);
  }
}

// ---------------------------------------------------------------------------
// Separação / Conferência
// ---------------------------------------------------------------------------

export async function registrarQuantidadeSeparadaAction(
  itemId: string,
  quantidade: number
): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_SEPARACAO);
  const bloqueio = await guardaArquivadoPorItemRemessa(itemId);
  if (bloqueio) return bloqueio;
  try {
    await prisma.$transaction((tx) => repo.registrarQuantidadeSeparada(tx, itemId, quantidade, session.user.id));
    revalidatePath("/expedicao");
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function registrarQuantidadeConferidaAction(
  itemId: string,
  quantidade: number
): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CONFERENCIA);
  const bloqueio = await guardaArquivadoPorItemRemessa(itemId);
  if (bloqueio) return bloqueio;
  try {
    await prisma.$transaction((tx) => repo.registrarQuantidadeConferida(tx, itemId, quantidade, session.user.id));
    revalidatePath("/expedicao");
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

/**
 * [CORREÇÃO A2, ponto 1] Ação EXPLÍCITA — a única forma de uma Remessa
 * chegar em LIBERADA_CARREGAMENTO. A recalculação automática do status
 * (disparada por separar/conferir itens) nunca faz isso sozinha.
 */
export async function finalizarConferenciaAction(
  remessaId: string
): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CONFERENCIA);
  const bloqueio = await guardaArquivadoPorRemessa(remessaId);
  if (bloqueio) return bloqueio;
  try {
    await prisma.$transaction((tx) => repo.finalizarConferencia(tx, remessaId, session.user.id));
    revalidatePath(`/expedicao/${remessaId}`);
    revalidatePath("/expedicao");
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

// ---------------------------------------------------------------------------
// Volumes
// ---------------------------------------------------------------------------

export async function criarVolumeAction(input: {
  remessaId: string;
  tipo: "CAIXA" | "PALETE" | "FEIXE" | "AVULSO" | "KIT" | "OUTRO";
  descricao?: string;
  peso?: number;
  lacre?: string;
}): Promise<Resultado<{ id: string }>> {
  await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_VOLUMES);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  try {
    const volume = await prisma.$transaction((tx) => repo.criarVolume(tx, input));
    revalidatePath(`/expedicao/${input.remessaId}`);
    return { id: volume.id };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function vincularItemAoVolumeAction(input: {
  volumeId: string;
  itemRemessaId: string;
  quantidade: number;
  remessaId: string;
}): Promise<Resultado> {
  await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_VOLUMES);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  try {
    await prisma.$transaction(
      (tx) => repo.vincularItemAoVolume(tx, input),
      { isolationLevel: "Serializable" }
    );
    revalidatePath(`/expedicao/${input.remessaId}`);
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

// ---------------------------------------------------------------------------
// Carregamentos
// ---------------------------------------------------------------------------

export async function criarCarregamentoAction(input: {
  remessaId: string;
  empresaId: string;
  observacao?: string;
  idempotencyKey?: string;
}): Promise<Resultado<{ id: string; numero: number }>> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CARREGAMENTO);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  const chave = input.idempotencyKey ?? randomUUID();

  try {
    const { resultado } = await comIdempotencia(
      prisma,
      { empresaId: input.empresaId, operacao: "criar_carregamento", chave, payload: input },
      async (tx) => {
        const carregamento = await repo.criarCarregamento(tx, {
          remessaId: input.remessaId,
          criadoPorId: session.user.id,
          observacao: input.observacao,
        });
        return { id: carregamento.id, numero: carregamento.numero };
      }
    );
    revalidatePath(`/expedicao/${input.remessaId}`);
    return resultado;
  } catch (e) {
    return tratarErro(e);
  }
}

export async function vincularVolumeAoCarregamentoAction(input: {
  carregamentoId: string;
  volumeId: string;
  remessaId: string;
  empresaId: string;
  idempotencyKey?: string;
}): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CARREGAMENTO);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  const chave = input.idempotencyKey ?? randomUUID();

  try {
    await comIdempotencia(
      prisma,
      { empresaId: input.empresaId, operacao: "adicionar_volume_carregamento", chave, payload: input },
      (tx) =>
        repo.vincularVolumeAoCarregamento(tx, {
          carregamentoId: input.carregamentoId,
          volumeId: input.volumeId,
          usuarioId: session.user.id,
        })
    );
    revalidatePath(`/expedicao/${input.remessaId}`);
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function desvincularVolumeDoCarregamentoAction(input: {
  carregamentoId: string;
  volumeId: string;
  remessaId: string;
}): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CARREGAMENTO);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  try {
    await prisma.$transaction(
      (tx) =>
        repo.desvincularVolumeDoCarregamento(tx, {
          carregamentoId: input.carregamentoId,
          volumeId: input.volumeId,
          usuarioId: session.user.id,
        }),
      { isolationLevel: "Serializable" }
    );
    revalidatePath(`/expedicao/${input.remessaId}`);
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function liberarCarregamentoAction(input: {
  carregamentoId: string;
  remessaId: string;
  empresaId: string;
  idempotencyKey?: string;
}): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_LIBERAR_CARREGAMENTO);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  const chave = input.idempotencyKey ?? randomUUID();

  try {
    await comIdempotencia(
      prisma,
      { empresaId: input.empresaId, operacao: "liberar_carregamento", chave, payload: input },
      (tx) => repo.liberarCarregamento(tx, { carregamentoId: input.carregamentoId, usuarioId: session.user.id })
    );
    revalidatePath(`/expedicao/${input.remessaId}`);
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function marcarComoCarregadoAction(input: {
  carregamentoId: string;
  remessaId: string;
}): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CARREGAMENTO);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  try {
    await prisma.$transaction((tx) =>
      repo.marcarComoCarregado(tx, { carregamentoId: input.carregamentoId, usuarioId: session.user.id })
    );
    revalidatePath(`/expedicao/${input.remessaId}`);
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function registrarSaidaAction(input: {
  carregamentoId: string;
  remessaId: string;
  empresaId: string;
  motoristaId?: string;
  veiculoId?: string;
  idempotencyKey?: string;
}): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_REGISTRAR_SAIDA);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  const chave = input.idempotencyKey ?? randomUUID();

  try {
    await comIdempotencia(
      prisma,
      { empresaId: input.empresaId, operacao: "registrar_saida", chave, payload: input },
      (tx) =>
        repo.registrarSaida(tx, {
          carregamentoId: input.carregamentoId,
          motoristaId: input.motoristaId,
          veiculoId: input.veiculoId,
          usuarioId: session.user.id,
        })
    );
    revalidatePath(`/expedicao/${input.remessaId}`);
    revalidatePath("/expedicao");
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function cancelarCarregamentoAction(input: {
  carregamentoId: string;
  remessaId: string;
  motivo: string;
}): Promise<Resultado> {
  const session = await exigirPermissao(PERMISSOES.EXPEDICAO_CANCELAR);
  const bloqueio = await guardaArquivadoPorRemessa(input.remessaId);
  if (bloqueio) return bloqueio;
  if (!input.motivo.trim()) return { erro: "Informe o motivo do cancelamento." };
  try {
    await prisma.$transaction((tx) =>
      repo.cancelarCarregamento(tx, {
        carregamentoId: input.carregamentoId,
        usuarioId: session.user.id,
        motivo: input.motivo,
      })
    );
    revalidatePath(`/expedicao/${input.remessaId}`);
    return { ok: true };
  } catch (e) {
    return tratarErro(e);
  }
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function buscarRemessaDetalheAction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return repo.buscarRemessaDetalhe(id);
}

export async function buscarHistoricoRemessaAction(remessaId: string) {
  return repo.buscarHistoricoRemessa(remessaId);
}

// ---------------------------------------------------------------------------
// Apoio ao formulário de Nova Remessa
// ---------------------------------------------------------------------------

export async function buscarDadosParaNovaRemessaAction(empreendimentoId: string) {
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: {
      id: true,
      nome: true,
      endereco: true,
      cidade: true,
      estado: true,
      clienteId: true,
      cliente: { select: { razaoSocial: true, nomeFantasia: true } },
      kitEletrico: true,
      kitHidraulico: true,
      kitQdc: true,
      tipologias: { select: { id: true, nome: true, quantidadeUnidades: true } },
      torres: { select: { id: true, nome: true } },
      excluidoEm: true,
    },
  });
  if (!empreendimento) return null;
  // [CORREÇÃO C2/C3.1] Empreendimento arquivado não deve alimentar o
  // formulário de nova remessa — mesmo padrão de "não encontrado", já
  // que o único consumidor é o formulário de criação (bloqueado de
  // qualquer forma em criarRemessaAction, esta é a defesa em profundidade).
  if (empreendimento.excluidoEm) return null;

  return {
    clienteId: empreendimento.clienteId,
    clienteNome: empreendimento.cliente.nomeFantasia ?? empreendimento.cliente.razaoSocial,
    enderecoSugerido: `${empreendimento.endereco} — ${empreendimento.cidade}/${empreendimento.estado}`,
    kitEletrico: empreendimento.kitEletrico,
    kitHidraulico: empreendimento.kitHidraulico,
    kitQdc: empreendimento.kitQdc,
    tipologias: empreendimento.tipologias,
    torres: empreendimento.torres,
  };
}

export async function listarEmpreendimentosParaRemessaAction() {
  return prisma.empreendimento.findMany({
    where: { excluidoEm: null },
    select: { id: true, codigo: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

export async function listarEmpresasAtivasAction() {
  return repo.listarEmpresasAtivas();
}

export async function listarTransportadorasAction() {
  return repo.listarTransportadoras();
}

export async function listarMotoristasAction(empresaId?: string) {
  return repo.listarMotoristas(empresaId);
}

export async function listarVeiculosAction(empresaId?: string) {
  return repo.listarVeiculos(empresaId);
}

export async function buscarFilaRemessasAction(filtros: repo.FiltrosFilaRemessa) {
  return repo.buscarFilaRemessas(filtros);
}

export async function criarTransportadoraAction(input: {
  nome: string;
  cnpj?: string;
  telefone?: string;
}): Promise<Resultado<{ id: string }>> {
  await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CADASTROS);
  if (!input.nome.trim()) return { erro: "Nome é obrigatório." };
  try {
    const t = await repo.criarTransportadora(input);
    revalidatePath("/expedicao/motoristas");
    revalidatePath("/expedicao/veiculos");
    return { id: t.id };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function criarMotoristaAction(input: {
  nome: string;
  empresaId: string;
  cpf?: string;
  cnh?: string;
  telefone?: string;
  transportadoraId?: string;
  tipo?: "PROPRIO" | "TERCEIRO";
}): Promise<Resultado<{ id: string }>> {
  await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CADASTROS);
  if (!input.nome.trim()) return { erro: "Nome é obrigatório." };
  try {
    const m = await repo.criarMotorista(input);
    revalidatePath("/expedicao/motoristas");
    return { id: m.id };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function criarVeiculoAction(input: {
  placa: string;
  empresaId: string;
  modelo?: string;
  capacidadeKg?: number;
  transportadoraId?: string;
  tipo?: "PROPRIO" | "TERCEIRO";
}): Promise<Resultado<{ id: string }>> {
  await exigirPermissao(PERMISSOES.EXPEDICAO_GERENCIAR_CADASTROS);
  if (!input.placa.trim()) return { erro: "Placa é obrigatória." };
  try {
    const v = await repo.criarVeiculo(input);
    revalidatePath("/expedicao/veiculos");
    return { id: v.id };
  } catch (e) {
    return tratarErro(e);
  }
}
