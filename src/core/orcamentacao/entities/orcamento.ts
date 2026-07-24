export type StatusOrcamento =
  | "EM_LEVANTAMENTO"
  | "ENVIADO_APROVACAO_GESTOR"
  | "ORCAMENTO_APROVADO"
  | "ORCAMENTO_DEVOLVIDO";

export type StatusAprovacao =
  | "NAO_ENVIADO"
  | "AGUARDANDO_APROVACAO"
  | "APROVADO"
  | "DEVOLVIDO"
  | "REJEITADO"
  | "EXPIRADO";

export type SituacaoItemServico =
  | "NORMAL"
  | "FORA_DO_ESCOPO"
  | "CORTESIA"
  | "AJUSTE_MANUAL"
  | "ERRO_DE_CALCULO";

export type SituacaoItemMaterial =
  | "NORMAL"
  | "PENDENTE_PRECIFICACAO"
  | "FORA_DO_ESCOPO"
  | "CLIENTE_FORNECE"
  | "FORNECEDOR_PENDENTE"
  | "CORTESIA"
  | "ERRO_DE_CALCULO";

export type EtapaJornada =
  | "LEVANTAMENTOS"
  | "COMPOSICAO"
  | "MATERIAIS"
  | "COTACOES"
  | "REVISAO"
  | "APROVACAO"
  | "PROPOSTA";

export type StatusEtapaJornada =
  | "NAO_INICIADA"
  | "EM_ANDAMENTO"
  | "CONCLUIDA"
  | "BLOQUEADA"
  | "DEVOLVIDA"
  | "APROVADA"
  | "CANCELADA";

export const ETAPAS_JORNADA: EtapaJornada[] = [
  "LEVANTAMENTOS",
  "COMPOSICAO",
  "MATERIAIS",
  "COTACOES",
  "REVISAO",
  "APROVACAO",
  "PROPOSTA",
];

export interface ItemServicoOrcamento {
  id: string;
  orcamentoId: string;
  tipologiaId?: string | null;
  tipologiaNome: string;
  kit: string; // "ELETRICO" | "HIDRAULICO" | "QDC"
  quantidade: number;
  precoBase: number;
  multiplicador: number;
  precoUnitario: number;
  total: number;
  /** Só preenchido no critério PONTOS_TETO — ver calcular-itens-servico.ts */
  pontos?: number | null;
  situacao: SituacaoItemServico;
  justificativa?: string | null;
  tierMultiplicadorId?: string | null;
  ajusteManual?: number | null;
  ajusteMotivo?: string | null;
  memoriaCalculo?: string | null;
}

export interface ItemMaterialOrcamento {
  id: string;
  orcamentoId: string;
  materialEletricoId?: string | null;
  tipologiaNome?: string | null;
  descricao: string;
  categoria?: string | null;
  unidade: string;
  quantidade: number;
  precoUnitario?: number | null;
  total?: number | null;
  situacao: SituacaoItemMaterial;
  justificativa?: string | null;
  fornecedorSelecionadoId?: string | null;
  cotacaoItemId?: string | null;
  itemTabelaPrecoId?: string | null;
  marca?: string | null;
  precoBase?: number | null;
  frete: number;
  impostos: number;
  perdas: number;
  memoriaCalculo?: string | null;
}

export interface OrcamentoJornadaEtapa {
  id: string;
  orcamentoId: string;
  etapa: EtapaJornada;
  status: StatusEtapaJornada;
  responsavelId?: string | null;
  dataInicio?: Date | null;
  dataPrevista?: Date | null;
  dataConclusao?: Date | null;
  motivoBloqueio?: string | null;
  pendencias?: string | null;
}

export interface OrcamentoHistoricoEvento {
  id: string;
  orcamentoId: string;
  tipoAlteracao: string;
  recursoTipo?: string | null;
  recursoId?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
  justificativa?: string | null;
  registradoPorId: string;
  registradoPorNome?: string;
  createdAt: Date;
}

export interface Orcamento {
  id: string;
  empreendimentoId: string;
  revisao: number;
  status: StatusOrcamento;
  tier: number;
  totalServicosHgi?: number | null;
  totalMateriais?: number | null;
  materiaisConferidos: boolean;
  observacoes?: string | null;
  criadoPorId?: string | null;
  itensServico: ItemServicoOrcamento[];
  itensMaterial: ItemMaterialOrcamento[];

  // Rastreamento
  responsavelId?: string | null;
  dataPrazo?: Date | null;

  // Financeiro desagregado
  custoDireto?: number | null;
  custoIndireto?: number | null;
  margemPrevista?: number | null;

  // Aprovação
  statusAprovacao: StatusAprovacao;
  aprovadoPorId?: string | null;
  dataAprovacao?: Date | null;
  motivoDevolucao?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/** Resumo para listagem */
export interface OrcamentoResumo {
  id: string;
  revisao: number;
  status: StatusOrcamento;
  tier: number;
  totalServicosHgi?: number | null;
  totalMateriais?: number | null;
  materiaisConferidos: boolean;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  dataPrazo?: Date | null;
  statusAprovacao: StatusAprovacao;
  createdAt: Date;
  updatedAt: Date;
}

/** Faixa de preço base por kit e área */
export interface TabelaPrecoBase {
  id: string;
  kit: string;
  criterio: "AREA" | "PONTOS_TETO";
  areaMin: number;
  areaMax: number;
  descricao: string;
  precoBase: number;
}

/** Multiplicador por tier */
export interface TierMultiplicador {
  id: string;
  tier: number;
  nome: string;
  multiplicador: number;
  descricao?: string | null;
}
