import { prisma } from "@/infra/db/prisma/client";
import type { Prisma } from "@/generated/prisma";
import {
  calcularSaldoDisponivel,
  validarAlocacao,
  podeVincularVolumeAoCarregamento,
  validarDivergenciaAntesDeLiberacao,
  recalcularItensCarregamento,
  podeRegistrarSaida,
  calcularStatusOperacionalRemessa,
  statusEhProtegidoDeRecalculoOperacional,
  statusOperacionalEhRegressao,
  tipoEventoParaStatusOperacional,
} from "@/core/expedicao/use-cases/validacoes-expedicao";
import type {
  StatusCarregamento,
  StatusRemessa,
  TipoKitExpedicao,
  TipoVolume,
  TipoEventoExpedicao,
} from "@/core/expedicao/entities/expedicao";
import { STATUS_CARREGAMENTO_ATIVOS } from "@/core/expedicao/entities/expedicao";

/**
 * Repositório do módulo de Expedição. Operações críticas de saldo usam
 * isolamento Serializable — ver core/expedicao/use-cases para a lógica
 * pura de validação, mantida sem I/O e testável isoladamente.
 */

// ---------------------------------------------------------------------------
// Numeração — contadores atômicos, sem MAX+1
// ---------------------------------------------------------------------------

/**
 * Gera o próximo número de Remessa pra uma empresa+ano, via UPDATE
 * atômico (INSERT...ON CONFLICT DO UPDATE...RETURNING) — sem janela de
 * corrida, diferente do padrão MAX+1 usado em Cliente/Empreendimento/
 * Fornecedor (aceitável lá pela baixíssima concorrência de cadastro, mas
 * inadequado aqui onde múltiplos carregamentos podem ser criados em
 * paralelo pela mesma equipe de expedição).
 */
async function gerarProximoNumeroRemessa(
  tx: Prisma.TransactionClient,
  empresaId: string,
  ano: number
): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ ultimo_numero: number }>>`
    INSERT INTO remessa_contadores (empresa_id, ano, ultimo_numero)
    VALUES (${empresaId}, ${ano}, 1)
    ON CONFLICT (empresa_id, ano)
    DO UPDATE SET ultimo_numero = remessa_contadores.ultimo_numero + 1
    RETURNING ultimo_numero
  `;
  return rows[0]!.ultimo_numero;
}

/** Incrementa atomicamente o contador de Carregamento escopado na própria Remessa. */
async function gerarProximoNumeroCarregamento(tx: Prisma.TransactionClient, remessaId: string): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ proximo_numero_carregamento: number }>>`
    UPDATE remessas
    SET proximo_numero_carregamento = proximo_numero_carregamento + 1
    WHERE id = ${remessaId}
    RETURNING (proximo_numero_carregamento - 1) AS proximo_numero_carregamento
  `;
  return rows[0]!.proximo_numero_carregamento;
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

async function registrarHistorico(
  tx: Prisma.TransactionClient,
  data: {
    empresaId: string;
    remessaId: string;
    carregamentoId?: string | null;
    tipoEvento: TipoEventoExpedicao;
    statusAnterior?: string | null;
    statusNovo: string;
    usuarioId: string;
    dadosAntes?: unknown;
    dadosDepois?: unknown;
    observacao?: string | null;
  }
): Promise<void> {
  await tx.expedicaoHistorico.create({
    data: {
      empresaId: data.empresaId,
      remessaId: data.remessaId,
      carregamentoId: data.carregamentoId ?? null,
      tipoEvento: data.tipoEvento,
      statusAnterior: data.statusAnterior ?? null,
      statusNovo: data.statusNovo,
      usuarioId: data.usuarioId,
      dadosAntes: data.dadosAntes as Prisma.InputJsonValue,
      dadosDepois: data.dadosDepois as Prisma.InputJsonValue,
      observacao: data.observacao ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Criar Remessa
// ---------------------------------------------------------------------------

export interface ItemRemessaInput {
  tipologiaId: string;
  tipologiaNome: string;
  tipoKit: TipoKitExpedicao;
  codigo?: string | null;
  descricao: string;
  unidade?: string;
  torre?: string | null;
  pavimento?: string | null;
  etapa?: string | null;
  apartamento?: string | null;
  quantidadePrevista: number;
}

export async function criarRemessa(
  tx: Prisma.TransactionClient,
  data: {
    empresaId: string;
    clienteId: string;
    empreendimentoId: string;
    origem?: string | null;
    torreId?: string | null;
    pavimentoId?: string | null;
    etapa?: string | null;
    enderecoEntrega: string;
    dataSaidaPrevista?: Date | null;
    dataEntregaPrevista?: Date | null;
    observacoes?: string | null;
    criadoPorId: string;
    itens: ItemRemessaInput[];
  }
) {
  // [CORREÇÃO A2, ponto 5] Impede a criação de Remessa sem itens — regra
  // no backend (repositório), não só na Action/UI. Uma remessa sem itens
  // nunca deveria existir de verdade, então nunca precisa de status
  // "AGUARDANDO_SEPARACAO" pra 0 itens (cenário coberto por teste dedicado).
  if (data.itens.length === 0) {
    throw new Error("Não é possível criar uma remessa sem itens.");
  }

  const ano = new Date().getFullYear();
  const sequencial = await gerarProximoNumeroRemessa(tx, data.empresaId, ano);
  const numero = `R-${ano}-${String(sequencial).padStart(4, "0")}`;

  const remessa = await tx.remessa.create({
    data: {
      empresaId: data.empresaId,
      ano,
      sequencial,
      numero,
      clienteId: data.clienteId,
      empreendimentoId: data.empreendimentoId,
      origem: data.origem,
      torreId: data.torreId,
      pavimentoId: data.pavimentoId,
      etapa: data.etapa,
      enderecoEntrega: data.enderecoEntrega,
      dataSaidaPrevista: data.dataSaidaPrevista,
      dataEntregaPrevista: data.dataEntregaPrevista,
      observacoes: data.observacoes,
      criadoPorId: data.criadoPorId,
      itens: {
        createMany: {
          data: data.itens.map((i) => ({
            tipologiaId: i.tipologiaId,
            tipologiaNome: i.tipologiaNome,
            tipoKit: i.tipoKit,
            codigo: i.codigo,
            descricao: i.descricao,
            unidade: i.unidade ?? "kit",
            torre: i.torre,
            pavimento: i.pavimento,
            etapa: i.etapa,
            apartamento: i.apartamento,
            quantidadePrevista: i.quantidadePrevista,
          })),
        },
      },
    },
    include: { itens: true },
  });

  await registrarHistorico(tx, {
    empresaId: data.empresaId,
    remessaId: remessa.id,
    tipoEvento: "REMESSA_CRIADA",
    statusNovo: "RASCUNHO",
    usuarioId: data.criadoPorId,
    dadosDepois: { numero, quantidadeItens: data.itens.length },
  });

  // [CORREÇÃO A2, ponto 3] Sai de RASCUNHO imediatamente e usa o retorno
  // da recalculação (não o objeto antigo com status RASCUNHO stale) —
  // a remessa devolvida por esta função sempre reflete o status real.
  const remessaComStatusAtualizado = await recalcularStatusOperacionalRemessa(tx, remessa.id, data.criadoPorId);

  return { ...remessa, status: remessaComStatusAtualizado.status };
}

// ---------------------------------------------------------------------------
// Separação e Conferência
// ---------------------------------------------------------------------------

export async function registrarQuantidadeSeparada(
  tx: Prisma.TransactionClient,
  itemId: string,
  quantidade: number,
  usuarioId: string
): Promise<void> {
  const item = await tx.itemRemessa.findUniqueOrThrow({ where: { id: itemId } });
  if (quantidade < 0 || quantidade > item.quantidadePrevista) {
    throw new Error(`Quantidade separada deve estar entre 0 e ${item.quantidadePrevista}.`);
  }
  await tx.itemRemessa.update({
    where: { id: itemId },
    data: {
      quantidadeSeparada: quantidade,
      status: quantidade >= item.quantidadePrevista ? "SEPARADO" : "PENDENTE",
    },
  });

  // [CORREÇÃO A2, ponto 2] usuarioId agora repassado pro histórico.
  await recalcularStatusOperacionalRemessa(tx, item.remessaId, usuarioId);
}

/**
 * [CORREÇÃO A2, ponto 2] Ganhou o parâmetro `usuarioId` — necessário pra
 * registrar quem causou a eventual mudança de status operacional no
 * histórico. Isso exigiu atualizar o único call site desta função em
 * `expedicao-actions.ts` (fora da lista original de 2 arquivos — ver
 * desvios registrados no relatório).
 */
export async function registrarQuantidadeConferida(
  tx: Prisma.TransactionClient,
  itemId: string,
  quantidade: number,
  usuarioId: string
): Promise<void> {
  const item = await tx.itemRemessa.findUniqueOrThrow({ where: { id: itemId } });
  if (quantidade < 0 || quantidade > item.quantidadeSeparada) {
    throw new Error(`Quantidade conferida deve estar entre 0 e ${item.quantidadeSeparada} (separado).`);
  }
  await tx.itemRemessa.update({
    where: { id: itemId },
    data: {
      quantidadeConferida: quantidade,
      status: quantidade >= item.quantidadeSeparada ? "CONFERIDO" : "DIVERGENTE",
    },
  });

  // [CORREÇÃO A2, ponto 2]
  await recalcularStatusOperacionalRemessa(tx, item.remessaId, usuarioId);
}

// ---------------------------------------------------------------------------
// Volumes
// ---------------------------------------------------------------------------

export async function criarVolume(
  tx: Prisma.TransactionClient,
  data: { remessaId: string; tipo: TipoVolume; descricao?: string | null; peso?: number | null; lacre?: string | null }
) {
  const ultimoVolume = await tx.volume.findFirst({
    where: { remessaId: data.remessaId },
    orderBy: { numeroVolume: "desc" },
    select: { numeroVolume: true },
  });
  const numeroVolume = (ultimoVolume?.numeroVolume ?? 0) + 1;

  return tx.volume.create({
    data: {
      remessaId: data.remessaId,
      numeroVolume,
      tipo: data.tipo,
      descricao: data.descricao,
      peso: data.peso,
      lacre: data.lacre,
    },
  });
}

/** Vincula um item ao volume — valida saldo (conferida - alocada - expedida) dentro da mesma transação. */
export async function vincularItemAoVolume(
  tx: Prisma.TransactionClient,
  data: { volumeId: string; itemRemessaId: string; quantidade: number }
): Promise<void> {
  const item = await tx.itemRemessa.findUniqueOrThrow({ where: { id: data.itemRemessaId } });

  // Soma o que já está alocado em volumes (ainda não necessariamente em
  // carregamento) — saldo aqui é só quantidadeConferida - itens já
  // colocados em ALGUM volume desta remessa (pra não embalar 2x o mesmo
  // material em volumes diferentes antes mesmo de carregar).
  const jaEmVolumes = await tx.itemVolume.aggregate({
    where: { itemRemessaId: data.itemRemessaId },
    _sum: { quantidade: true },
  });
  const totalJaEmVolumes = jaEmVolumes._sum.quantidade ?? 0;
  const disponivelPraEmbalar = item.quantidadeConferida - totalJaEmVolumes;

  if (data.quantidade <= 0 || data.quantidade > disponivelPraEmbalar) {
    throw new Error(
      `Quantidade inválida: disponível pra embalar ${disponivelPraEmbalar}, solicitado ${data.quantidade}.`
    );
  }

  await tx.itemVolume.create({
    data: { volumeId: data.volumeId, itemRemessaId: data.itemRemessaId, quantidade: data.quantidade },
  });
}

// ---------------------------------------------------------------------------
// Carregamentos
// ---------------------------------------------------------------------------

export async function criarCarregamento(
  tx: Prisma.TransactionClient,
  data: { remessaId: string; criadoPorId: string; observacao?: string | null }
) {
  const numero = await gerarProximoNumeroCarregamento(tx, data.remessaId);
  const carregamento = await tx.carregamento.create({
    data: {
      remessaId: data.remessaId,
      numero,
      criadoPorId: data.criadoPorId,
      observacao: data.observacao,
    },
  });

  const remessa = await tx.remessa.findUniqueOrThrow({ where: { id: data.remessaId } });
  await registrarHistorico(tx, {
    empresaId: remessa.empresaId,
    remessaId: data.remessaId,
    carregamentoId: carregamento.id,
    tipoEvento: "CARREGAMENTO_CRIADO",
    statusNovo: "RASCUNHO",
    usuarioId: data.criadoPorId,
  });

  return carregamento;
}

/**
 * Vincula um Volume a um Carregamento — a operação crítica de saldo desse
 * módulo. Valida exclusividade (volume não pode estar preso a outro
 * carregamento ativo), valida saldo de cada item contido no volume, e
 * recalcula ItemCarregamento a partir da soma de ItemVolume (fonte de
 * verdade única). Deve ser chamada dentro de uma transação Serializable.
 */
export async function vincularVolumeAoCarregamento(
  tx: Prisma.TransactionClient,
  data: { carregamentoId: string; volumeId: string; usuarioId: string }
): Promise<void> {
  const [volume, carregamento] = await Promise.all([
    tx.volume.findUniqueOrThrow({ where: { id: data.volumeId } }),
    tx.carregamento.findUniqueOrThrow({ where: { id: data.carregamentoId } }),
  ]);

  const vinculosExistentes = await tx.volumeCarregamento.findMany({
    where: { volumeId: data.volumeId },
    include: { carregamento: { select: { status: true } } },
  });
  const statusDosCarregamentosVinculados = vinculosExistentes.map((v) => v.carregamento.status as StatusCarregamento);

  const validacao = podeVincularVolumeAoCarregamento({
    volumeStatus: volume.status,
    volumeRemessaId: volume.remessaId,
    carregamentoRemessaId: carregamento.remessaId,
    statusDosCarregamentosVinculados,
  });
  if (!validacao.valido) throw new Error(validacao.motivo);

  const itensDoVolume = await tx.itemVolume.findMany({ where: { volumeId: data.volumeId } });

  // Valida saldo de CADA item contido no volume antes de confirmar o vínculo.
  for (const iv of itensDoVolume) {
    const item = await tx.itemRemessa.findUniqueOrThrow({ where: { id: iv.itemRemessaId } });
    const val = validarAlocacao(item, iv.quantidade);
    if (!val.valido) {
      throw new Error(`${item.descricao}: ${val.motivo}`);
    }
  }

  await tx.volumeCarregamento.create({ data: { carregamentoId: data.carregamentoId, volumeId: data.volumeId } });
  await tx.volume.update({ where: { id: data.volumeId }, data: { status: "ALOCADO" } });

  // Incrementa quantidadeAlocada de cada item + recalcula ItemCarregamento
  for (const iv of itensDoVolume) {
    await tx.itemRemessa.update({
      where: { id: iv.itemRemessaId },
      data: { quantidadeAlocada: { increment: iv.quantidade } },
    });
  }
  await recalcularEArmazenarItensCarregamento(tx, data.carregamentoId);

  const remessaDoCarregamento = await tx.remessa.findUniqueOrThrow({
    where: { id: carregamento.remessaId },
    select: { empresaId: true },
  });
  await registrarHistorico(tx, {
    empresaId: remessaDoCarregamento.empresaId,
    remessaId: carregamento.remessaId,
    carregamentoId: data.carregamentoId,
    tipoEvento: "VOLUME_VINCULADO_CARREGAMENTO",
    statusNovo: carregamento.status,
    usuarioId: data.usuarioId,
    dadosDepois: { volumeId: data.volumeId, itens: itensDoVolume.length },
  });
}

/** Desvincula (ex: engano) — devolve o saldo alocado e volta o volume pra CONFERIDO. */
export async function desvincularVolumeDoCarregamento(
  tx: Prisma.TransactionClient,
  data: { carregamentoId: string; volumeId: string; usuarioId: string }
): Promise<void> {
  const carregamento = await tx.carregamento.findUniqueOrThrow({ where: { id: data.carregamentoId } });
  if (!STATUS_CARREGAMENTO_ATIVOS.includes(carregamento.status as StatusCarregamento) || carregamento.status === "SAIDA_REGISTRADA" || carregamento.status === "ENTREGUE") {
    throw new Error("Não é possível desvincular volume de um carregamento já expedido.");
  }

  const itensDoVolume = await tx.itemVolume.findMany({ where: { volumeId: data.volumeId } });

  await tx.volumeCarregamento.delete({
    where: { carregamentoId_volumeId: { carregamentoId: data.carregamentoId, volumeId: data.volumeId } },
  });
  await tx.volume.update({ where: { id: data.volumeId }, data: { status: "CONFERIDO" } });

  for (const iv of itensDoVolume) {
    await tx.itemRemessa.update({
      where: { id: iv.itemRemessaId },
      data: { quantidadeAlocada: { decrement: iv.quantidade } },
    });
  }
  await recalcularEArmazenarItensCarregamento(tx, data.carregamentoId);

  const remessaDoCarregamento1 = await tx.remessa.findUniqueOrThrow({
    where: { id: carregamento.remessaId },
    select: { empresaId: true },
  });
  await registrarHistorico(tx, {
    empresaId: remessaDoCarregamento1.empresaId,
    remessaId: carregamento.remessaId,
    carregamentoId: data.carregamentoId,
    tipoEvento: "VOLUME_DESVINCULADO_CARREGAMENTO",
    statusNovo: carregamento.status,
    usuarioId: data.usuarioId,
  });
}

async function recalcularEArmazenarItensCarregamento(tx: Prisma.TransactionClient, carregamentoId: string): Promise<void> {
  const volumesVinculados = await tx.volumeCarregamento.findMany({
    where: { carregamentoId },
    select: { volumeId: true },
  });
  const volumeIds = volumesVinculados.map((v) => v.volumeId);

  const itensVolume = volumeIds.length
    ? await tx.itemVolume.findMany({ where: { volumeId: { in: volumeIds } } })
    : [];

  const recalculado = recalcularItensCarregamento(
    itensVolume.map((iv) => ({ id: iv.id, volumeId: iv.volumeId, itemRemessaId: iv.itemRemessaId, quantidade: iv.quantidade }))
  );

  // Substitui o snapshot de ItemCarregamento pelo recalculado (nunca
  // editado manualmente — sempre derivado de ItemVolume).
  await tx.itemCarregamento.deleteMany({ where: { carregamentoId } });
  if (recalculado.length > 0) {
    await tx.itemCarregamento.createMany({
      data: recalculado.map((r) => ({ carregamentoId, itemRemessaId: r.itemRemessaId, quantidade: r.quantidade })),
    });
  }
}

/** Libera o carregamento — valida que não há divergência entre ItemCarregamento e ItemVolume dos volumes vinculados. */
export async function liberarCarregamento(
  tx: Prisma.TransactionClient,
  data: { carregamentoId: string; usuarioId: string }
): Promise<void> {
  const carregamento = await tx.carregamento.findUniqueOrThrow({ where: { id: data.carregamentoId } });
  if (carregamento.status !== "CONFERIDO") {
    throw new Error(`Só é possível liberar um carregamento em CONFERIDO (atual: ${carregamento.status}).`);
  }

  const itensCarregamento = await tx.itemCarregamento.findMany({ where: { carregamentoId: data.carregamentoId } });
  const volumesVinculados = await tx.volumeCarregamento.findMany({
    where: { carregamentoId: data.carregamentoId },
    select: { volumeId: true },
  });
  const itensVolume = volumesVinculados.length
    ? await tx.itemVolume.findMany({ where: { volumeId: { in: volumesVinculados.map((v) => v.volumeId) } } })
    : [];

  const validacao = validarDivergenciaAntesDeLiberacao({
    itensCarregamento,
    itensVolumeDosVolumesVinculados: itensVolume,
  });
  if (!validacao.valido) throw new Error(validacao.motivo);

  await tx.carregamento.update({
    where: { id: data.carregamentoId },
    data: { status: "LIBERADO", liberadoPorId: data.usuarioId },
  });

  const remessaDoCarregamento2 = await tx.remessa.findUniqueOrThrow({
    where: { id: carregamento.remessaId },
    select: { empresaId: true },
  });
  await registrarHistorico(tx, {
    empresaId: remessaDoCarregamento2.empresaId,
    remessaId: carregamento.remessaId,
    carregamentoId: data.carregamentoId,
    tipoEvento: "CARREGAMENTO_LIBERADO",
    statusAnterior: "CONFERIDO",
    statusNovo: "LIBERADO",
    usuarioId: data.usuarioId,
  });
}

/** Confirma que os volumes/itens foram fisicamente embarcados — LIBERADO → CARREGADO. */
export async function marcarComoCarregado(
  tx: Prisma.TransactionClient,
  data: { carregamentoId: string; usuarioId: string }
): Promise<void> {
  const carregamento = await tx.carregamento.findUniqueOrThrow({ where: { id: data.carregamentoId } });
  if (carregamento.status !== "LIBERADO") {
    throw new Error(`Só é possível marcar como carregado a partir de LIBERADO (atual: ${carregamento.status}).`);
  }

  const itensCarregamento = await tx.itemCarregamento.findMany({ where: { carregamentoId: data.carregamentoId } });
  for (const ic of itensCarregamento) {
    await tx.itemRemessa.update({
      where: { id: ic.itemRemessaId },
      data: { quantidadeCarregada: { increment: ic.quantidade } },
    });
  }

  await tx.carregamento.update({
    where: { id: data.carregamentoId },
    data: { status: "CARREGADO", dataCarregamento: new Date() },
  });

  const remessaDoCarregamento3 = await tx.remessa.findUniqueOrThrow({
    where: { id: carregamento.remessaId },
    select: { empresaId: true },
  });
  await registrarHistorico(tx, {
    empresaId: remessaDoCarregamento3.empresaId,
    remessaId: carregamento.remessaId,
    carregamentoId: data.carregamentoId,
    tipoEvento: "CARREGAMENTO_MARCADO_CARREGADO",
    statusAnterior: "LIBERADO",
    statusNovo: "CARREGADO",
    usuarioId: data.usuarioId,
  });
}

/** Registra a saída física — só a partir de CARREGADO. quantidadeExpedida nunca regride. */
export async function registrarSaida(
  tx: Prisma.TransactionClient,
  data: { carregamentoId: string; motoristaId?: string | null; veiculoId?: string | null; usuarioId: string }
): Promise<void> {
  const carregamento = await tx.carregamento.findUniqueOrThrow({ where: { id: data.carregamentoId } });
  const validacao = podeRegistrarSaida(carregamento.status as StatusCarregamento);
  if (!validacao.valido) throw new Error(validacao.motivo);

  const remessa = await tx.remessa.findUniqueOrThrow({ where: { id: carregamento.remessaId } });

  // Valida motorista/veículo da mesma empresa e ativos, se informados.
  if (data.motoristaId) {
    const motorista = await tx.motorista.findUniqueOrThrow({ where: { id: data.motoristaId } });
    if (motorista.empresaId !== remessa.empresaId) throw new Error("Motorista pertence a uma empresa diferente da remessa.");
    if (!motorista.ativo) throw new Error("Motorista está inativo.");
  }
  if (data.veiculoId) {
    const veiculo = await tx.veiculo.findUniqueOrThrow({ where: { id: data.veiculoId } });
    if (veiculo.empresaId !== remessa.empresaId) throw new Error("Veículo pertence a uma empresa diferente da remessa.");
    if (!veiculo.ativo) throw new Error("Veículo está inativo.");
  }

  const itensCarregamento = await tx.itemCarregamento.findMany({ where: { carregamentoId: data.carregamentoId } });
  for (const ic of itensCarregamento) {
    await tx.itemRemessa.update({
      where: { id: ic.itemRemessaId },
      data: {
        quantidadeAlocada: { decrement: ic.quantidade },
        quantidadeCarregada: { decrement: ic.quantidade },
        quantidadeExpedida: { increment: ic.quantidade },
      },
    });
  }

  const volumesVinculados = await tx.volumeCarregamento.findMany({ where: { carregamentoId: data.carregamentoId } });
  await tx.volume.updateMany({
    where: { id: { in: volumesVinculados.map((v) => v.volumeId) } },
    data: { status: "EMBARCADO" },
  });

  await tx.carregamento.update({
    where: { id: data.carregamentoId },
    data: {
      status: "SAIDA_REGISTRADA",
      dataSaida: new Date(),
      ...(data.motoristaId && { motoristaId: data.motoristaId }),
      ...(data.veiculoId && { veiculoId: data.veiculoId }),
    },
  });

  await registrarHistorico(tx, {
    empresaId: remessa.empresaId,
    remessaId: carregamento.remessaId,
    carregamentoId: data.carregamentoId,
    tipoEvento: "SAIDA_REGISTRADA",
    statusAnterior: "CARREGADO",
    statusNovo: "SAIDA_REGISTRADA",
    usuarioId: data.usuarioId,
  });

  // Recalcula status da Remessa a partir de quantidadeExpedida (nunca de alocada/carregada)
  await recalcularStatusRemessa(tx, carregamento.remessaId);
}

async function recalcularStatusRemessa(tx: Prisma.TransactionClient, remessaId: string): Promise<void> {
  const itens = await tx.itemRemessa.findMany({ where: { remessaId } });
  const totalPrevisto = itens.reduce((acc, i) => acc + i.quantidadePrevista, 0);
  const totalExpedido = itens.reduce((acc, i) => acc + i.quantidadeExpedida, 0);

  let novoStatus: string | null = null;
  if (totalExpedido > 0 && totalExpedido < totalPrevisto) novoStatus = "PARCIALMENTE_EXPEDIDA";
  else if (totalExpedido >= totalPrevisto && totalPrevisto > 0) novoStatus = "TOTALMENTE_EXPEDIDA";

  if (novoStatus) {
    await tx.remessa.update({ where: { id: remessaId }, data: { status: novoStatus as never } });
  }
}

/**
 * [CORREÇÃO A2, revisão 2] Detecta se a Remessa já tem movimentação
 * operacional real (ponto 6) — volumes com itens embalados,
 * carregamentos ainda ativos, ou qualquer item com alocação/carga/
 * expedição maior que zero. Usada só pra BLOQUEAR regressão automática
 * de status quando já existe esse tipo de compromisso operacional.
 */
async function remessaTemMovimentacaoOperacional(
  tx: Prisma.TransactionClient,
  remessaId: string
): Promise<boolean> {
  const [volumesComItens, carregamentosAtivos, itensComMovimentacao] = await Promise.all([
    tx.volume.count({ where: { remessaId, itens: { some: {} } } }),
    tx.carregamento.count({ where: { remessaId, status: { not: "CANCELADO" } } }),
    tx.itemRemessa.count({
      where: {
        remessaId,
        OR: [
          { quantidadeAlocada: { gt: 0 } },
          { quantidadeCarregada: { gt: 0 } },
          { quantidadeExpedida: { gt: 0 } },
        ],
      },
    }),
  ]);
  return volumesComItens > 0 || carregamentosAtivos > 0 || itensComMovimentacao > 0;
}

/**
 * [CORREÇÃO A2, revisão 2] Recalcula o status OPERACIONAL da Remessa
 * (etapas pré-liberação: AGUARDANDO_SEPARACAO → EM_SEPARACAO →
 * AGUARDANDO_CONFERENCIA → EM_CONFERENCIA — NUNCA LIBERADA_CARREGAMENTO
 * automaticamente, ver `finalizarConferencia` abaixo).
 *
 * Chamada a partir de: criarRemessa, registrarQuantidadeSeparada,
 * registrarQuantidadeConferida — todas passam `usuarioId` agora (ponto 2).
 *
 * Retorna a Remessa atualizada (ponto 3) — ou a mesma remessa buscada, se
 * nada mudou — pra quem chamar nunca ficar com um objeto desatualizado.
 *
 * Regras de segurança aplicadas:
 *  - Nunca sobrescreve um status protegido (ponto 6 parcial, já existia)
 *  - Nunca regride o status se já existe movimentação operacional real:
 *    volumes com item, carregamento ativo, ou qualquer quantidade
 *    alocada/carregada/expedida > 0 (ponto 6, novo)
 *  - Sem mudança de status = sem update, sem histórico (ponto 8, evita
 *    histórico duplicado)
 *  - Remessa sem itens nunca chega aqui de verdade (bloqueada na criação,
 *    ponto 5) — guarda defensiva mesmo assim, retorna sem fazer nada
 */
async function recalcularStatusOperacionalRemessa(
  tx: Prisma.TransactionClient,
  remessaId: string,
  usuarioId: string
) {
  const remessa = await tx.remessa.findUniqueOrThrow({ where: { id: remessaId } });

  if (statusEhProtegidoDeRecalculoOperacional(remessa.status as StatusRemessa)) {
    return remessa;
  }

  const itens = await tx.itemRemessa.findMany({
    where: { remessaId },
    select: { quantidadePrevista: true, quantidadeSeparada: true, quantidadeConferida: true },
  });

  // Ponto 5 — defensivo: não deveria acontecer (criarRemessa já impede
  // remessa sem itens), mas se acontecer, não decide status nenhum aqui.
  if (itens.length === 0) return remessa;

  const novoStatus = calcularStatusOperacionalRemessa(itens);
  if (novoStatus === remessa.status) return remessa; // sem mudança, sem histórico duplicado

  // Ponto 6 — bloqueia regressão automática se já há movimentação real.
  if (statusOperacionalEhRegressao(remessa.status as StatusRemessa, novoStatus)) {
    const temMovimentacao = await remessaTemMovimentacaoOperacional(tx, remessaId);
    if (temMovimentacao) return remessa; // mantém status atual, sem tocar em nada
  }

  const remessaAtualizada = await tx.remessa.update({ where: { id: remessaId }, data: { status: novoStatus } });

  // Ponto 2 — histórico completo na MESMA transação.
  await registrarHistorico(tx, {
    empresaId: remessa.empresaId,
    remessaId,
    tipoEvento: tipoEventoParaStatusOperacional(novoStatus),
    statusAnterior: remessa.status,
    statusNovo: novoStatus,
    usuarioId,
    dadosAntes: { status: remessa.status },
    dadosDepois: { status: novoStatus },
  });

  return remessaAtualizada;
}

/**
 * [CORREÇÃO A2, ponto 1] Ação EXPLÍCITA de liberação pra carregamento —
 * é a ÚNICA forma de uma Remessa chegar em LIBERADA_CARREGAMENTO. A
 * recalculação automática (acima) nunca faz essa transição sozinha.
 *
 * Validação por item (ponto 4): exige que TODOS os itens estejam
 * totalmente separados E totalmente conferidos — não aceita soma
 * agregada. A checagem de permissão (usuário autorizado) fica na Action
 * correspondente (arquitetura do projeto: repositório não valida
 * permissão, só a camada de Action faz isso via exigirPermissao()).
 */
export async function finalizarConferencia(
  tx: Prisma.TransactionClient,
  remessaId: string,
  usuarioId: string
) {
  const remessa = await tx.remessa.findUniqueOrThrow({ where: { id: remessaId } });

  if (statusEhProtegidoDeRecalculoOperacional(remessa.status as StatusRemessa)) {
    throw new Error(`Não é possível finalizar conferência: remessa está em ${remessa.status}.`);
  }
  if (remessa.status !== "EM_CONFERENCIA") {
    throw new Error(`Só é possível finalizar conferência a partir de EM_CONFERENCIA (atual: ${remessa.status}).`);
  }

  const itens = await tx.itemRemessa.findMany({
    where: { remessaId },
    select: { id: true, descricao: true, quantidadePrevista: true, quantidadeSeparada: true, quantidadeConferida: true },
  });
  if (itens.length === 0) {
    throw new Error("Remessa sem itens não pode ser liberada.");
  }

  const itensIncompletos = itens.filter(
    (i) => i.quantidadeSeparada < i.quantidadePrevista || i.quantidadeConferida < i.quantidadeSeparada
  );
  if (itensIncompletos.length > 0) {
    throw new Error(
      `Não é possível liberar: ${itensIncompletos.length} item(ns) ainda não estão 100% conferidos (${itensIncompletos
        .map((i) => i.descricao)
        .join(", ")}).`
    );
  }

  const remessaAtualizada = await tx.remessa.update({
    where: { id: remessaId },
    data: { status: "LIBERADA_CARREGAMENTO" },
  });

  await registrarHistorico(tx, {
    empresaId: remessa.empresaId,
    remessaId,
    tipoEvento: "CONFERENCIA_FINALIZADA",
    statusAnterior: remessa.status,
    statusNovo: "LIBERADA_CARREGAMENTO",
    usuarioId,
    dadosAntes: { status: remessa.status },
    dadosDepois: { status: "LIBERADA_CARREGAMENTO" },
  });

  return remessaAtualizada;
}

/** Cancela um carregamento — devolve saldo (alocada, e carregada se já tinha sido marcado). */
export async function cancelarCarregamento(
  tx: Prisma.TransactionClient,
  data: { carregamentoId: string; usuarioId: string; motivo: string }
): Promise<void> {
  const carregamento = await tx.carregamento.findUniqueOrThrow({ where: { id: data.carregamentoId } });
  if (carregamento.status === "SAIDA_REGISTRADA" || carregamento.status === "ENTREGUE" || carregamento.status === "CANCELADO") {
    throw new Error(`Não é possível cancelar um carregamento em ${carregamento.status}.`);
  }

  const jaCarregado = carregamento.status === "CARREGADO";
  const itensCarregamento = await tx.itemCarregamento.findMany({ where: { carregamentoId: data.carregamentoId } });

  for (const ic of itensCarregamento) {
    await tx.itemRemessa.update({
      where: { id: ic.itemRemessaId },
      data: {
        quantidadeAlocada: { decrement: ic.quantidade },
        ...(jaCarregado && { quantidadeCarregada: { decrement: ic.quantidade } }),
      },
    });
  }

  const volumesVinculados = await tx.volumeCarregamento.findMany({ where: { carregamentoId: data.carregamentoId } });
  await tx.volume.updateMany({
    where: { id: { in: volumesVinculados.map((v) => v.volumeId) } },
    data: { status: "CONFERIDO" },
  });

  await tx.carregamento.update({
    where: { id: data.carregamentoId },
    data: { status: "CANCELADO", observacao: data.motivo },
  });

  const remessaDoCarregamento4 = await tx.remessa.findUniqueOrThrow({
    where: { id: carregamento.remessaId },
    select: { empresaId: true },
  });
  await registrarHistorico(tx, {
    empresaId: remessaDoCarregamento4.empresaId,
    remessaId: carregamento.remessaId,
    carregamentoId: data.carregamentoId,
    tipoEvento: "CARREGAMENTO_CANCELADO",
    statusAnterior: carregamento.status,
    statusNovo: "CANCELADO",
    usuarioId: data.usuarioId,
    observacao: data.motivo,
  });
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function buscarRemessaDetalhe(id: string) {
  return prisma.remessa.findUnique({
    where: { id },
    include: {
      cliente: { select: { razaoSocial: true, nomeFantasia: true } },
      empreendimento: { select: { codigo: true, nome: true, cidade: true, estado: true } },
      empresa: { select: { nome: true } },
      criadoPor: { select: { nome: true } },
      itens: { orderBy: { createdAt: "asc" } },
      volumes: { orderBy: { numeroVolume: "asc" }, include: { itens: true } },
      carregamentos: {
        orderBy: { numero: "asc" },
        include: {
          itens: true,
          volumes: { include: { volume: true } },
          transportadora: { select: { nome: true } },
          motorista: { select: { nome: true } },
          veiculo: { select: { placa: true, modelo: true } },
        },
      },
    },
  });
}

export async function buscarHistoricoRemessa(remessaId: string) {
  return prisma.expedicaoHistorico.findMany({
    where: { remessaId },
    include: { usuario: { select: { nome: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Fila de Remessas — Central de Expedição
// ---------------------------------------------------------------------------

export interface FiltrosFilaRemessa {
  busca?: string;
  empreendimentoId?: string;
  transportadoraId?: string;
  status?: string;
  visao?: "todas" | "hoje" | "aguardando" | "em_rota" | "com_divergencia";
}

export async function buscarFilaRemessas(filtros: FiltrosFilaRemessa = {}) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const where: Prisma.RemessaWhereInput = { deletedAt: null };

  if (filtros.busca) {
    where.OR = [
      { numero: { contains: filtros.busca, mode: "insensitive" } },
      { empreendimento: { nome: { contains: filtros.busca, mode: "insensitive" } } },
    ];
  }
  if (filtros.empreendimentoId) where.empreendimentoId = filtros.empreendimentoId;
  if (filtros.status) where.status = filtros.status as never;

  if (filtros.visao === "hoje") {
    where.dataSaidaPrevista = { gte: hoje, lt: amanha };
  } else if (filtros.visao === "aguardando") {
    where.status = { in: ["AGUARDANDO_SEPARACAO", "EM_SEPARACAO", "AGUARDANDO_CONFERENCIA", "EM_CONFERENCIA"] } as never;
  } else if (filtros.visao === "em_rota") {
    where.status = { in: ["EM_TRANSITO", "PARCIALMENTE_EXPEDIDA"] } as never;
  } else if (filtros.visao === "com_divergencia") {
    where.itens = { some: { status: "DIVERGENTE" } };
  }

  const remessas = await prisma.remessa.findMany({
    where,
    include: {
      empreendimento: { select: { nome: true, cidade: true, estado: true } },
      itens: { select: { status: true, quantidadePrevista: true, quantidadeExpedida: true } },
      volumes: { select: { id: true, status: true } },
      carregamentos: {
        select: { status: true, transportadora: { select: { nome: true } } },
        orderBy: { numero: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const linhas = remessas.map((r) => {
    const temDivergencia = r.itens.some((i) => i.status === "DIVERGENTE");
    const ultimoCarregamento = r.carregamentos[0];
    return {
      id: r.id,
      numero: r.numero,
      empreendimentoNome: r.empreendimento.nome,
      cidade: r.empreendimento.cidade,
      estado: r.empreendimento.estado,
      torreEtapa: r.etapa ?? "—",
      volumes: r.volumes.length,
      transportadoraNome: ultimoCarregamento?.transportadora?.nome ?? "—",
      dataSaidaPrevista: r.dataSaidaPrevista,
      status: r.status,
      temDivergencia,
    };
  });

  const indicadores = {
    remessasDoDia: remessas.filter((r) => r.dataSaidaPrevista && r.dataSaidaPrevista >= hoje && r.dataSaidaPrevista < amanha).length,
    aguardandoConferencia: remessas.filter((r) => r.status === "AGUARDANDO_CONFERENCIA" || r.status === "EM_CONFERENCIA").length,
    liberadasCarregamento: remessas.filter((r) => r.status === "LIBERADA_CARREGAMENTO").length,
    emRota: remessas.filter((r) => r.status === "EM_TRANSITO" || r.status === "PARCIALMENTE_EXPEDIDA").length,
    comDivergencia: remessas.filter((r) => r.itens.some((i) => i.status === "DIVERGENTE")).length,
  };

  return { linhas, indicadores };
}

// ---------------------------------------------------------------------------
// Cadastros — Transportadora / Motorista / Veículo
// ---------------------------------------------------------------------------

export async function listarTransportadoras() {
  return prisma.transportadora.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}

export async function listarMotoristas(empresaId?: string) {
  return prisma.motorista.findMany({
    where: { ativo: true, ...(empresaId && { empresaId }) },
    include: { transportadora: { select: { nome: true } } },
    orderBy: { nome: "asc" },
  });
}

export async function listarVeiculos(empresaId?: string) {
  const veiculos = await prisma.veiculo.findMany({
    where: { ativo: true, ...(empresaId && { empresaId }) },
    include: { transportadora: { select: { nome: true } } },
    orderBy: { placa: "asc" },
  });
  // Prisma retorna Decimal pra campos @db.Decimal — converte pra number
  // puro antes de devolver, já que o domínio/UI espera number | null.
  return veiculos.map((v) => ({
    ...v,
    capacidadeKg: v.capacidadeKg == null ? null : Number(v.capacidadeKg),
  }));
}

export async function criarTransportadora(data: { nome: string; cnpj?: string | null; telefone?: string | null }) {
  return prisma.transportadora.create({ data });
}

export async function criarMotorista(data: {
  nome: string;
  empresaId: string;
  cpf?: string | null;
  cnh?: string | null;
  telefone?: string | null;
  transportadoraId?: string | null;
  tipo?: "PROPRIO" | "TERCEIRO";
}) {
  return prisma.motorista.create({ data });
}

export async function criarVeiculo(data: {
  placa: string;
  empresaId: string;
  modelo?: string | null;
  capacidadeKg?: number | null;
  transportadoraId?: string | null;
  tipo?: "PROPRIO" | "TERCEIRO";
}) {
  return prisma.veiculo.create({ data });
}

export async function listarEmpresasAtivas() {
  return prisma.empresaGrupo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}
