/**
 * Entidade de domínio: Empreendimento.
 *
 * Este tipo representa o Empreendimento do ponto de vista do NEGÓCIO,
 * não do banco de dados. Por isso ele não importa nada do Prisma — mesmo
 * que hoje os campos sejam quase idênticos aos do schema, essa
 * independência é o que permite, por exemplo, trocar o ORM no futuro
 * sem reescrever nenhuma regra de negócio que dependa deste tipo.
 *
 * Campos de módulos futuros (Engenharia, Levantamento, Orçamento) que já
 * existem no schema Prisma como opcionais aparecem aqui também como
 * opcionais, pelo mesmo motivo: ainda não há regra de negócio definida
 * sobre eles.
 */

export type StatusEmpreendimento =
  | "PROSPECCAO"
  | "COMERCIAL"
  | "ORCAMENTACAO"
  | "NEGOCIACAO"
  | "CONTRATADO"
  | "SUPRIMENTOS"
  | "PRODUCAO"
  | "CONCLUIDO"
  | "ARQUIVADO";

export type TipoEmpreendimento =
  | "RESIDENCIAL_VERTICAL"
  | "RESIDENCIAL_HORIZONTAL"
  | "COMERCIAL"
  | "INDUSTRIAL"
  | "INFRAESTRUTURA"
  | "LOTEAMENTO";

export type TipoEstrutura =
  | "CONCRETO_ARMADO"
  | "ALVENARIA_ESTRUTURAL"
  | "PAREDE_DE_CONCRETO"
  | "ESTRUTURA_METALICA"
  | "STEEL_FRAME"
  | "WOOD_FRAME";

export interface Empreendimento {
  id: string;
  codigo: string;

  // Informações gerais
  nome: string;
  clienteId: string; // FK real para Cliente (desde o Módulo 3)
  cidade: string;
  estado: string;
  endereco: string;
  tipo: TipoEmpreendimento;
  construtora: string;
  incorporadora?: string | null;

  // Engenharia — tipo de estrutura já coletado no cadastro porque é
  // decisivo para definir o tipo de caixa/kit no Orçamento (Módulo 8).
  tipoEstrutura?: TipoEstrutura | null;
  metodoConstrutivo?: string | null;
  tipoLaje?: string | null;
  tipoVedacao?: string | null;

  // Informações comerciais
  responsavelComercial: string;
  status: StatusEmpreendimento;
  // Tier do empreendimento (0-3) — herdado do cliente na criação, mas
  // ajustável por empreendimento. Usado como default na Orçamentação.
  tier?: number | null;
  criterioPrecificacao?: "AREA" | "PONTOS_TETO" | null;
  dataPrevistaInicio?: Date | null;
  dataPrevistaEntrega?: Date | null;

  // Valor do empreendimento. Não é capturado na prospecção — só passa a
  // existir depois do Levantamento Quantitativo e da Orçamentação
  // (Módulos 7/8). Até lá, sempre null.
  valorEstimado?: number | null;

  // Responsáveis internos — relação real com Usuario desde o Módulo 2
  // (Autenticação). Atribuição é opcional: nem todo empreendimento
  // precisa ter um responsável de cada área desde a criação.
  responsavelComercialUserId?: string | null;
  responsavelEngenhariaUserId?: string | null;
  responsavelOrcamentacaoUserId?: string | null;

  observacoes?: string | null;

  // Se este empreendimento terá Hall — pergunta de nível geral (não por
  // torre/pavimento), feita no cadastro.
  temHall: boolean;
  // "TODOS" (soma dos pavimentos de todas as torres) ou "ESPECIFICO"
  // (número digitado manualmente). Resolvido automaticamente numa
  // Tipologia sintética "Hall" sincronizada ao salvar a estrutura.
  hallTipo?: "TODOS" | "ESPECIFICO" | null;
  hallQuantidadeEspecifica?: number | null;

  // Tipos de kit contratados — independentes, qualquer combinação válida.
  // Decisivo para Levantamento Quantitativo e Orçamentação (Módulos 7/8).
  kitEletrico: boolean;
  kitHidraulico: boolean;
  kitQdc: boolean;
  tiposInstalacao: string[]; // JSON array de tipos de instalação do kit elétrico

  // Soft delete — quando preenchido, o empreendimento está "excluído"
  // mas preservado no banco. Só Admin/Diretor podem excluir e recuperar.
  excluidoEm?: Date | null;
  excluidoPorId?: string | null;

  createdAt: Date;
  updatedAt: Date;
}
