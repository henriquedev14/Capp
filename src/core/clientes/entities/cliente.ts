/**
 * Entidade de domínio: Cliente (Construtora).
 *
 * No contexto da HGI, o "cliente" é sempre a construtora que contrata o
 * serviço de industrialização de kits elétricos e hidráulicos.
 */
export interface ClienteContato {
  id: string;
  clienteId: string;
  nome: string;
  cargo?: string | null;
  telefone?: string | null;
  email?: string | null;
  principal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cliente {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  ativo: boolean;
  /**
   * Tier do cliente (0 = altíssimo padrão ... 3 = econômico) — mesmo
   * modelo numérico de TierMultiplicador. Herdado pelos empreendimentos
   * na criação; null = ainda não classificado.
   */
  tier?: number | null;
  contatos: ClienteContato[];
  createdAt: Date;
  updatedAt: Date;
}

/** Versão resumida usada em listagens e seletores */
export interface ClienteResumo {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  cidade?: string | null;
  estado?: string | null;
  ativo: boolean;
  tier?: number | null;
  totalEmpreendimentos: number;
}
