export type UnidadeMedidaBancada = "METROS" | "PECAS";
export type TipoCalculoBancada = "CABO" | "ELETRODUTO" | "CONTAGEM";

export interface Bancada {
  id: string;
  nome: string;
  ordem: number;
  unidadeMedida: UnidadeMedidaBancada;
  tipoCalculo: TipoCalculoBancada;
  uhReferencia: number;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperadorProducao {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistroProducao {
  id: string;
  bancadaId: string;
  operadorId: string;
  empreendimentoId: string;
  quantidade: number;
  registradoPorUserId: string;
  valorOriginal?: number | null;
  corrigidoPorUserId?: string | null;
  corrigidoEm?: Date | null;
  createdAt: Date;
}

/**
 * Converte produção bruta (metros ou peças, conforme a bancada) pra
 * "U.H." (Unidade Habitacional equivalente) — a moeda comum que permite
 * comparar produtividade entre bancadas diferentes contra a mesma meta.
 */
export function calcularQuantidadeUH(quantidadeBruta: number, uhReferencia: number): number {
  if (uhReferencia <= 0) return 0;
  return quantidadeBruta / uhReferencia;
}

/** % da meta diária atingida, a partir da quantidade já em U.H. */
export function calcularPercentualMeta(quantidadeUH: number, metaDiariaUH: number): number {
  if (metaDiariaUH <= 0) return 0;
  return quantidadeUH / metaDiariaUH;
}
