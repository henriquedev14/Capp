import type { TorreInput, TipologiaInput, Torre, Tipologia } from "@/core/empreendimentos/entities/estrutura-fisica";

export interface EstruturaFisicaRepository {
  /**
   * Busca a estrutura física completa (Torre -> Pavimento -> Unidade) de
   * um Empreendimento — usado para pré-popular o formulário de edição.
   */
  buscarEstrutura(empreendimentoId: string): Promise<Torre[]>;

  /** Busca o catálogo de Tipologias de um Empreendimento. */
  buscarTipologias(empreendimentoId: string): Promise<Tipologia[]>;

  /**
   * Cria a estrutura física completa de um Empreendimento a partir de
   * inputs simples (nome + pavimentos + unidades por pavimento por
   * Torre) — expande isso em registros reais de Torre, Pavimento e
   * Unidade no banco. As unidades nascem sem tipologia atribuída.
   *
   * Operação substitutiva: ao ser chamada na edição, apaga toda a
   * estrutura física existente do empreendimento e recria do zero a
   * partir do novo input — mais simples e previsível do que tentar
   * calcular um "diff" entre a estrutura antiga e a nova nesta etapa.
   */
  substituirEstrutura(empreendimentoId: string, torres: TorreInput[]): Promise<void>;

  /**
   * Mesma lógica substitutiva, mas para o catálogo de Tipologias do
   * empreendimento.
   */
  substituirTipologias(empreendimentoId: string, tipologias: TipologiaInput[]): Promise<void>;

  /**
   * Sincroniza a Tipologia sintética "Hall" a partir da configuração de
   * Hall do empreendimento — nunca cadastrada manualmente pelo usuário.
   */
  sincronizarTipologiaHall(
    empreendimentoId: string,
    temHall: boolean,
    quantidadeResolvida: number
  ): Promise<void>;
}
