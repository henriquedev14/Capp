import type {
  ItemRemessa,
  ItemVolume,
  ItemCarregamento,
  Volume,
  Carregamento,
  StatusCarregamento,
  StatusVolume,
  StatusRemessa,
  TipoEventoExpedicao,
} from "@/core/expedicao/entities/expedicao";
import { STATUS_CARREGAMENTO_ATIVOS } from "@/core/expedicao/entities/expedicao";

/**
 * Lógica pura (sem I/O) do módulo de Expedição — saldo, máquina de
 * estados e validações. Mantida separada do repositório/actions pra
 * poder ser testada isoladamente (mesmo padrão de
 * core/orcamentacao/use-cases/jornada-orcamento.ts).
 */

// ---------------------------------------------------------------------------
// Saldo
// ---------------------------------------------------------------------------

/**
 * saldoDisponivel = quantidadeConferida - quantidadeAlocada - quantidadeExpedida
 *
 * quantidadeExpedida NUNCA regride — kits já expedidos não voltam a ficar
 * disponíveis, mesmo que o saldo pareça "sobrar" matematicamente.
 */
export function calcularSaldoDisponivel(item: {
  quantidadeConferida: number;
  quantidadeAlocada: number;
  quantidadeExpedida: number;
}): number {
  return item.quantidadeConferida - item.quantidadeAlocada - item.quantidadeExpedida;
}

export interface ResultadoValidacao {
  valido: boolean;
  motivo?: string;
}

/** Valida se dá pra alocar `quantidade` unidades de um item num novo vínculo (volume/carregamento). */
export function validarAlocacao(
  item: { quantidadeConferida: number; quantidadeAlocada: number; quantidadeExpedida: number },
  quantidade: number
): ResultadoValidacao {
  if (quantidade <= 0) {
    return { valido: false, motivo: "Quantidade deve ser maior que zero." };
  }
  const saldo = calcularSaldoDisponivel(item);
  if (quantidade > saldo) {
    return {
      valido: false,
      motivo: `Saldo insuficiente: disponível ${saldo}, solicitado ${quantidade}.`,
    };
  }
  return { valido: true };
}

// ---------------------------------------------------------------------------
// Status derivado da Remessa — só a partir de quantidadeExpedida
// ---------------------------------------------------------------------------

export function calcularStatusExpedicaoRemessa(
  itens: Array<{ quantidadePrevista: number; quantidadeExpedida: number }>
): "NENHUM" | "PARCIAL" | "TOTAL" {
  const totalPrevisto = itens.reduce((acc, i) => acc + i.quantidadePrevista, 0);
  const totalExpedido = itens.reduce((acc, i) => acc + i.quantidadeExpedida, 0);

  if (totalExpedido <= 0) return "NENHUM";
  if (totalExpedido < totalPrevisto) return "PARCIAL";
  return "TOTAL";
}

// ---------------------------------------------------------------------------
// [CORREÇÃO A2, revisão 2] Status operacional da Remessa — etapas PRÉ-expedição
//
// Causa raiz corrigida: antes desta função, Remessa.status só era escrito
// no momento da saída (via calcularStatusExpedicaoRemessa acima), então os
// status AGUARDANDO_SEPARACAO/EM_SEPARACAO/AGUARDANDO_CONFERENCIA/
// EM_CONFERENCIA nunca eram atribuídos por nenhum código real — toda
// remessa ficava presa em RASCUNHO até a 1ª saída.
//
// Ajustes da revisão (validação reprovada e corrigida):
//  1. NUNCA retorna LIBERADA_CARREGAMENTO automaticamente — conferência
//     100% completa para automaticamente em EM_CONFERENCIA. A transição
//     pra LIBERADA_CARREGAMENTO só acontece via finalizarConferencia(),
//     ação explícita com permissão própria (ver repositório/actions).
//  4. Verifica CADA item individualmente (`.every()`), não soma agregada —
//     excesso num item não pode compensar falta em outro.
//  7. StatusOperacionalRemessa é um Extract<> de StatusRemessa (tipo de
//     domínio já existente), não uma union redefinida do zero.
// ---------------------------------------------------------------------------

export type StatusOperacionalRemessa = Extract<
  StatusRemessa,
  "AGUARDANDO_SEPARACAO" | "EM_SEPARACAO" | "AGUARDANDO_CONFERENCIA" | "EM_CONFERENCIA"
>;

/**
 * Calcula o status operacional da Remessa nas etapas PRÉ-liberação,
 * verificando o estado de CADA item individualmente — nunca soma
 * agregada. Um item 100% conferido não compensa outro que ainda nem foi
 * separado.
 *
 * IMPORTANTE: nunca retorna algo diferente de EM_CONFERENCIA mesmo quando
 * todos os itens estão 100% conferidos — a liberação pra carregamento é
 * sempre uma ação explícita (ver `finalizarConferencia` no repositório).
 *
 * Pressupõe pelo menos 1 item (ver ponto 5 — remessa sem itens é
 * impedida na criação, em `criarRemessa`, não tratada aqui).
 */
export function calcularStatusOperacionalRemessa(
  itens: Array<{ quantidadePrevista: number; quantidadeSeparada: number; quantidadeConferida: number }>
): StatusOperacionalRemessa {
  const nenhumItemSeparado = itens.every((i) => i.quantidadeSeparada === 0);
  if (nenhumItemSeparado) return "AGUARDANDO_SEPARACAO";

  const todosOsItensTotalmenteSeparados = itens.every((i) => i.quantidadeSeparada >= i.quantidadePrevista);
  if (!todosOsItensTotalmenteSeparados) return "EM_SEPARACAO";

  const nenhumItemConferido = itens.every((i) => i.quantidadeConferida === 0);
  if (nenhumItemConferido) return "AGUARDANDO_CONFERENCIA";

  // Mesmo com todos os itens 100% conferidos (`.every((i) =>
  // i.quantidadeConferida >= i.quantidadeSeparada)` seria `true` aqui),
  // NÃO retorna LIBERADA_CARREGAMENTO — ponto 1 da revisão.
  return "EM_CONFERENCIA";
}

/**
 * Ordem de progresso operacional — usada só para detectar REGRESSÃO
 * (ponto 6). LIBERADA_CARREGAMENTO fica de fora de propósito: só se chega
 * lá via ação explícita, nunca pela recalculação automática, então nunca
 * pode ser "regredido" por ela.
 */
const ORDEM_STATUS_OPERACIONAL: StatusOperacionalRemessa[] = [
  "AGUARDANDO_SEPARACAO",
  "EM_SEPARACAO",
  "AGUARDANDO_CONFERENCIA",
  "EM_CONFERENCIA",
];

/** true se `novo` está numa etapa ANTERIOR a `atual` na ordem operacional. */
export function statusOperacionalEhRegressao(
  atual: StatusRemessa,
  novo: StatusOperacionalRemessa
): boolean {
  const indiceAtual = ORDEM_STATUS_OPERACIONAL.indexOf(atual as StatusOperacionalRemessa);
  const indiceNovo = ORDEM_STATUS_OPERACIONAL.indexOf(novo);
  if (indiceAtual === -1 || indiceNovo === -1) return false;
  return indiceNovo < indiceAtual;
}

/**
 * Escolhe o tipoEvento de histórico mais apropriado pro status recém
 * calculado — reaproveita valores já existentes no enum (nenhum enum
 * novo foi criado; mudança de schema exigiria aprovação separada).
 */
export function tipoEventoParaStatusOperacional(novoStatus: StatusOperacionalRemessa): TipoEventoExpedicao {
  switch (novoStatus) {
    case "AGUARDANDO_SEPARACAO":
    case "EM_SEPARACAO":
      return "ITEM_SEPARADO";
    case "AGUARDANDO_CONFERENCIA":
      return "SEPARACAO_FINALIZADA";
    case "EM_CONFERENCIA":
      return "ITEM_CONFERIDO";
  }
}

/**
 * Status que NUNCA podem ser sobrescritos pela recalculação operacional
 * automática — são estados pós-expedição ou terminais. Sem essa guarda,
 * uma remessa parcialmente expedida poderia "voltar" pra EM_CONFERENCIA
 * por engano se algum item fosse conferido fora de ordem depois da saída.
 *
 * Tipagem (ponto 7): recebe StatusRemessa (tipo de domínio), não string
 * genérica — um valor inválido não compila mais.
 */
const STATUS_PROTEGIDOS_DE_RECALCULO_OPERACIONAL: StatusRemessa[] = [
  "PARCIALMENTE_EXPEDIDA",
  "TOTALMENTE_EXPEDIDA",
  "EM_TRANSITO",
  "ENTREGUE",
  "CANCELADA",
];

export function statusEhProtegidoDeRecalculoOperacional(statusAtual: StatusRemessa): boolean {
  return STATUS_PROTEGIDOS_DE_RECALCULO_OPERACIONAL.includes(statusAtual);
}

// ---------------------------------------------------------------------------
// Máquina de estados — Volume
// ---------------------------------------------------------------------------

const TRANSICOES_VOLUME: Record<StatusVolume, StatusVolume[]> = {
  ABERTO: ["CONFERIDO", "CANCELADO"],
  CONFERIDO: ["ALOCADO", "CANCELADO"],
  ALOCADO: ["EMBARCADO", "CANCELADO", "CONFERIDO"], // volta pra CONFERIDO se desvincular do carregamento
  EMBARCADO: [], // terminal — sem edição direta depois disso
  CANCELADO: [],
};

export function podeTransicionarVolume(atual: StatusVolume, novo: StatusVolume): ResultadoValidacao {
  if (atual === "EMBARCADO") {
    return { valido: false, motivo: "Volume já embarcado não pode ser alterado." };
  }
  const permitidos = TRANSICOES_VOLUME[atual] ?? [];
  if (!permitidos.includes(novo)) {
    return { valido: false, motivo: `Não é possível ir de ${atual} para ${novo}.` };
  }
  return { valido: true };
}

/**
 * Um volume só pode ser vinculado a um novo carregamento se não estiver
 * preso a nenhum carregamento "ativo" (qualquer status exceto CANCELADO —
 * incluindo os já com saída registrada ou entregues, que nunca liberam
 * o volume pra reuso).
 */
export function podeVincularVolumeAoCarregamento(params: {
  volumeStatus: StatusVolume;
  volumeRemessaId: string;
  carregamentoRemessaId: string;
  statusDosCarregamentosVinculados: StatusCarregamento[];
}): ResultadoValidacao {
  if (params.volumeStatus === "EMBARCADO" || params.volumeStatus === "CANCELADO") {
    return { valido: false, motivo: `Volume está ${params.volumeStatus} — não pode ser vinculado.` };
  }
  if (params.volumeRemessaId !== params.carregamentoRemessaId) {
    return { valido: false, motivo: "Volume pertence a outra remessa." };
  }
  const jaPreso = params.statusDosCarregamentosVinculados.some((s) => STATUS_CARREGAMENTO_ATIVOS.includes(s));
  if (jaPreso) {
    return { valido: false, motivo: "Volume já está vinculado a um carregamento ativo." };
  }
  return { valido: true };
}

// ---------------------------------------------------------------------------
// Máquina de estados — Carregamento
// ---------------------------------------------------------------------------

const TRANSICOES_CARREGAMENTO: Record<StatusCarregamento, StatusCarregamento[]> = {
  RASCUNHO: ["EM_PREPARACAO", "CANCELADO"],
  EM_PREPARACAO: ["AGUARDANDO_CONFERENCIA", "CANCELADO"],
  AGUARDANDO_CONFERENCIA: ["CONFERIDO", "CANCELADO"],
  CONFERIDO: ["LIBERADO", "CANCELADO"],
  LIBERADO: ["CARREGADO", "CANCELADO"],
  CARREGADO: ["SAIDA_REGISTRADA", "CANCELADO"],
  SAIDA_REGISTRADA: ["ENTREGUE"], // não cancela mais depois da saída, nesta etapa
  ENTREGUE: [],
  CANCELADO: [],
};

export function podeTransicionarCarregamento(
  atual: StatusCarregamento,
  novo: StatusCarregamento
): ResultadoValidacao {
  const permitidos = TRANSICOES_CARREGAMENTO[atual] ?? [];
  if (!permitidos.includes(novo)) {
    return { valido: false, motivo: `Não é possível ir de ${atual} para ${novo}.` };
  }
  return { valido: true };
}

/** Regra dura: registrarSaida() só a partir de CARREGADO — nunca de LIBERADO direto. */
export function podeRegistrarSaida(statusAtual: StatusCarregamento): ResultadoValidacao {
  if (statusAtual !== "CARREGADO") {
    return {
      valido: false,
      motivo: `Só é possível registrar saída com o carregamento em CARREGADO (atual: ${statusAtual}).`,
    };
  }
  return { valido: true };
}

/**
 * Antes de liberar (LIBERADO), a soma dos ItemCarregamento precisa bater
 * exatamente com a soma dos ItemVolume dos volumes vinculados — evita
 * divergência entre "o que o sistema acha que vai" e "o que realmente
 * está embalado".
 */
export function validarDivergenciaAntesDeLiberacao(params: {
  itensCarregamento: ItemCarregamento[];
  itensVolumeDosVolumesVinculados: ItemVolume[];
}): ResultadoValidacao {
  const porItemCarregamento = new Map<string, number>();
  for (const ic of params.itensCarregamento) {
    porItemCarregamento.set(ic.itemRemessaId, (porItemCarregamento.get(ic.itemRemessaId) ?? 0) + ic.quantidade);
  }

  const porItemVolume = new Map<string, number>();
  for (const iv of params.itensVolumeDosVolumesVinculados) {
    porItemVolume.set(iv.itemRemessaId, (porItemVolume.get(iv.itemRemessaId) ?? 0) + iv.quantidade);
  }

  const todasAsChaves = new Set([...porItemCarregamento.keys(), ...porItemVolume.keys()]);
  const divergencias: string[] = [];
  for (const chave of todasAsChaves) {
    const viaCarregamento = porItemCarregamento.get(chave) ?? 0;
    const viaVolume = porItemVolume.get(chave) ?? 0;
    if (viaCarregamento !== viaVolume) {
      divergencias.push(`Item ${chave}: carregamento=${viaCarregamento}, volumes=${viaVolume}`);
    }
  }

  if (divergencias.length > 0) {
    return {
      valido: false,
      motivo: `Divergência entre itens do carregamento e dos volumes vinculados: ${divergencias.join("; ")}`,
    };
  }
  return { valido: true };
}

/**
 * Recalcula os ItemCarregamento a partir da soma de ItemVolume dos
 * volumes atualmente vinculados a um carregamento — usado sempre que um
 * volume é vinculado/desvinculado, garantindo que ItemCarregamento nunca
 * seja editado manualmente (fonte de verdade é sempre ItemVolume).
 */
export function recalcularItensCarregamento(
  itensVolumeDosVolumesVinculados: ItemVolume[]
): Array<{ itemRemessaId: string; quantidade: number }> {
  const porItem = new Map<string, number>();
  for (const iv of itensVolumeDosVolumesVinculados) {
    porItem.set(iv.itemRemessaId, (porItem.get(iv.itemRemessaId) ?? 0) + iv.quantidade);
  }
  return Array.from(porItem.entries()).map(([itemRemessaId, quantidade]) => ({ itemRemessaId, quantidade }));
}

// ---------------------------------------------------------------------------
// Validações de contexto (tipologia/cliente/empresa)
// ---------------------------------------------------------------------------

export function validarTipologiaPertenceAoEmpreendimento(
  tipologiaEmpreendimentoId: string,
  remessaEmpreendimentoId: string
): ResultadoValidacao {
  if (tipologiaEmpreendimentoId !== remessaEmpreendimentoId) {
    return { valido: false, motivo: "Tipologia não pertence ao empreendimento desta remessa." };
  }
  return { valido: true };
}

export function validarClienteDoEmpreendimento(
  clienteIdRemessa: string,
  clienteIdEmpreendimento: string
): ResultadoValidacao {
  if (clienteIdRemessa !== clienteIdEmpreendimento) {
    return { valido: false, motivo: "Cliente da remessa não corresponde ao cliente do empreendimento." };
  }
  return { valido: true };
}

export function validarMotoristaVeiculoMesmaEmpresa(params: {
  empresaIdRemessa: string;
  empresaIdMotorista?: string | null;
  empresaIdVeiculo?: string | null;
}): ResultadoValidacao {
  if (params.empresaIdMotorista && params.empresaIdMotorista !== params.empresaIdRemessa) {
    return { valido: false, motivo: "Motorista pertence a uma empresa diferente da remessa." };
  }
  if (params.empresaIdVeiculo && params.empresaIdVeiculo !== params.empresaIdRemessa) {
    return { valido: false, motivo: "Veículo pertence a uma empresa diferente da remessa." };
  }
  return { valido: true };
}

export function validarVeiculoAtivo(ativo: boolean): ResultadoValidacao {
  if (!ativo) return { valido: false, motivo: "Veículo está inativo." };
  return { valido: true };
}

export function validarMotoristaAtivo(ativo: boolean): ResultadoValidacao {
  if (!ativo) return { valido: false, motivo: "Motorista está inativo." };
  return { valido: true };
}
