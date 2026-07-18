/**
 * Catálogo de Tiers — 4 níveis (0 a 3), espelhando o seed de
 * TierMultiplicador no banco (src/infra/db/prisma/seed.ts).
 *
 * IMPORTANTE: os multiplicadores exibidos aqui são apenas informativos
 * para a UI. A fonte de verdade para CÁLCULO é sempre a tabela
 * tier_multiplicadores no banco (editável pelo Admin no futuro módulo
 * de Configurações) — nunca estas constantes.
 */

export interface TierOption {
  /** Valor numérico persistido no banco (Cliente.tier, Empreendimento.tier, Orcamento.tier) */
  value: number;
  /** Rótulo curto para badges — ex: "Tier 0" */
  labelCurto: string;
  /** Nome completo — ex: "Altíssimo Padrão" */
  nome: string;
  /** Multiplicador de referência do seed (informativo) */
  multiplicadorReferencia: number;
}

export const TIERS: TierOption[] = [
  { value: 0, labelCurto: "Tier 0", nome: "Altíssimo Padrão", multiplicadorReferencia: 1.5 },
  { value: 1, labelCurto: "Tier 1", nome: "Alto Padrão", multiplicadorReferencia: 1.2 },
  { value: 2, labelCurto: "Tier 2", nome: "Médio Padrão", multiplicadorReferencia: 1.0 },
  { value: 3, labelCurto: "Tier 3", nome: "Econômico", multiplicadorReferencia: 0.8 },
];

export function getTierOption(tier?: number | null): TierOption | undefined {
  if (tier === null || tier === undefined) return undefined;
  return TIERS.find((t) => t.value === tier);
}

/** Opções no formato { value, label } para selects de formulário. */
export const TIER_SELECT_OPTIONS = TIERS.map((t) => ({
  value: String(t.value),
  label: `${t.labelCurto} — ${t.nome} (×${t.multiplicadorReferencia.toFixed(2).replace(".", ",")})`,
}));

/** Values válidos do tier quando serializado como string em formulários. */
export const TIER_STRING_VALUES = ["0", "1", "2", "3"] as const;
