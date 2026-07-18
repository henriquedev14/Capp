export type StatusRemessa =
  | "RASCUNHO"
  | "AGUARDANDO_SEPARACAO"
  | "EM_SEPARACAO"
  | "AGUARDANDO_CONFERENCIA"
  | "EM_CONFERENCIA"
  | "LIBERADA_CARREGAMENTO"
  | "PARCIALMENTE_EXPEDIDA"
  | "TOTALMENTE_EXPEDIDA"
  | "EM_TRANSITO"
  | "ENTREGUE"
  | "CANCELADA";

export type StatusItemRemessa = "PENDENTE" | "SEPARADO" | "CONFERIDO" | "CARREGADO" | "DIVERGENTE";

export type StatusVolume = "ABERTO" | "CONFERIDO" | "ALOCADO" | "EMBARCADO" | "CANCELADO";

export type TipoVolume = "CAIXA" | "PALETE" | "FEIXE" | "AVULSO" | "KIT" | "OUTRO";

export type StatusCarregamento =
  | "RASCUNHO"
  | "EM_PREPARACAO"
  | "AGUARDANDO_CONFERENCIA"
  | "CONFERIDO"
  | "LIBERADO"
  | "CARREGADO"
  | "SAIDA_REGISTRADA"
  | "ENTREGUE"
  | "CANCELADO";

export type TipoTransporte = "PROPRIO" | "TERCEIRO";

export type TipoKitExpedicao = "ELETRICO" | "HIDRAULICO" | "QDC";

export type TipoEventoExpedicao =
  | "REMESSA_CRIADA"
  | "REMESSA_CANCELADA"
  | "SEPARACAO_INICIADA"
  | "ITEM_SEPARADO"
  | "SEPARACAO_FINALIZADA"
  | "CONFERENCIA_INICIADA"
  | "ITEM_CONFERIDO"
  | "CONFERENCIA_FINALIZADA"
  | "VOLUME_CRIADO"
  | "VOLUME_CANCELADO"
  | "ITEM_VINCULADO_VOLUME"
  | "CARREGAMENTO_CRIADO"
  | "VOLUME_VINCULADO_CARREGAMENTO"
  | "VOLUME_DESVINCULADO_CARREGAMENTO"
  | "CARREGAMENTO_LIBERADO"
  | "CARREGAMENTO_MARCADO_CARREGADO"
  | "SAIDA_REGISTRADA"
  | "CARREGAMENTO_CANCELADO"
  | "ENTREGA_CONFIRMADA";

/** Estados de Carregamento que ainda "prendem" um volume (impedem reuso). */
export const STATUS_CARREGAMENTO_ATIVOS: StatusCarregamento[] = [
  "RASCUNHO",
  "EM_PREPARACAO",
  "AGUARDANDO_CONFERENCIA",
  "CONFERIDO",
  "LIBERADO",
  "CARREGADO",
  "SAIDA_REGISTRADA",
  "ENTREGUE",
];

export interface ItemRemessa {
  id: string;
  remessaId: string;
  tipologiaId: string;
  tipoKit: TipoKitExpedicao;
  tipologiaNome: string;
  codigo?: string | null;
  descricao: string;
  unidade: string;
  torre?: string | null;
  pavimento?: string | null;
  etapa?: string | null;
  apartamento?: string | null;
  quantidadePrevista: number;
  quantidadeSeparada: number;
  quantidadeConferida: number;
  quantidadeAlocada: number;
  quantidadeCarregada: number;
  quantidadeExpedida: number;
  status: StatusItemRemessa;
  observacao?: string | null;
}

export interface Remessa {
  id: string;
  empresaId: string;
  ano: number;
  sequencial: number;
  numero: string;
  clienteId: string;
  empreendimentoId: string;
  origem?: string | null;
  torreId?: string | null;
  pavimentoId?: string | null;
  etapa?: string | null;
  enderecoEntrega: string;
  status: StatusRemessa;
  proximoNumeroCarregamento: number;
  dataSaidaPrevista?: Date | null;
  dataEntregaPrevista?: Date | null;
  observacoes?: string | null;
  criadoPorId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Volume {
  id: string;
  remessaId: string;
  numeroVolume: number;
  tipo: TipoVolume;
  codigoQr?: string | null;
  descricao?: string | null;
  peso?: number | null;
  lacre?: string | null;
  status: StatusVolume;
  observacao?: string | null;
}

export interface ItemVolume {
  id: string;
  volumeId: string;
  itemRemessaId: string;
  quantidade: number;
}

export interface Carregamento {
  id: string;
  remessaId: string;
  numero: number;
  status: StatusCarregamento;
  transportadoraId?: string | null;
  motoristaId?: string | null;
  veiculoId?: string | null;
  placa?: string | null;
  dataCarregamento?: Date | null;
  dataSaida?: Date | null;
  observacao?: string | null;
  criadoPorId: string;
  liberadoPorId?: string | null;
}

export interface ItemCarregamento {
  id: string;
  carregamentoId: string;
  itemRemessaId: string;
  quantidade: number;
}
