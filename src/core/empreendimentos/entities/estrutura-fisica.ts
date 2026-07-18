/**
 * Entidades de domínio da estrutura física de um Empreendimento.
 *
 * Bloco existe como camada opcional no schema, mas o Módulo 4 (Cadastro
 * de Empreendimentos) gera e consome apenas Torre -> Pavimento -> Unidade
 * — por isso Bloco não tem entidade de domínio própria ainda. Quando essa
 * camada for de fato necessária, ela entra aqui.
 */

export interface Tipologia {
  id: string;
  empreendimentoId: string;
  nome: string;
  areaPrivativa?: number | null;
  // Quantidade de unidades desta tipologia no empreendimento — base para
  // consolidar levantamento (por unidade × quantidade) e orçamentação.
  quantidadeUnidades: number;
  descricao?: string | null;
}

export interface Unidade {
  id: string;
  pavimentoId: string;
  identificacao: string;
  tipologiaId?: string | null;
}

export interface Pavimento {
  id: string;
  torreId: string;
  nome: string;
  ordem: number;
  unidades: Unidade[];
}

export interface Torre {
  id: string;
  empreendimentoId: string;
  nome: string;
  ordem: number;
  pavimentos: Pavimento[];
}

/**
 * Input para gerar a estrutura física de um Torre ao criar/editar um
 * Empreendimento — números simples que o use-case expande em
 * Torre -> Pavimento -> Unidade no banco. Cada torre pode ter
 * quantidades diferentes de pavimento/unidade.
 */
export interface TorreInput {
  nome: string;
  pavimentos: number;
  unidadesPorPavimento: number;
}

/** Input para criar uma Tipologia nomeada ao cadastrar o Empreendimento. */
export interface TipologiaInput {
  nome: string;
  areaPrivativa?: number | null;
  quantidadeUnidades: number;
  descricao?: string | null;
}
