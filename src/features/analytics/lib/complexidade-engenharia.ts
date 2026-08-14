import type { EngenhariaPacoteAnalytics } from "@/features/analytics/lib/types";

export function nivelComplexidade(pontos: number): EngenhariaPacoteAnalytics["complexidadeNivel"] {
  if (pontos <= 20) return "MUITO_SIMPLES";
  if (pontos <= 40) return "SIMPLES";
  if (pontos <= 60) return "MODERADA";
  if (pontos <= 80) return "COMPLEXA";
  return "MUITO_COMPLEXA";
}

function bonusTier(tier: number | null): number {
  // Tier é apenas um fator auxiliar. A complexidade vem principalmente do
  // conteúdo técnico do pacote; isso evita usar "alto padrão" como atalho.
  if (tier === 0) return 9;
  if (tier === 1) return 6;
  if (tier === 2) return 3;
  return 0;
}

function bonusEstrutura(tipoEstrutura: string | null, metodoConstrutivo: string | null, tiposInstalacao: string): number {
  let score = 0;
  if (tipoEstrutura && !["ALVENARIA_ESTRUTURAL", "PAREDE_DE_CONCRETO"].includes(tipoEstrutura)) score += 3;
  if (metodoConstrutivo?.trim()) score += 2;
  try {
    const tipos = JSON.parse(tiposInstalacao) as unknown;
    if (Array.isArray(tipos)) score += Math.min(5, Math.max(0, tipos.length - 1) * 2);
  } catch {
    // Dado legado inválido não pode derrubar Analytics.
  }
  return score;
}

export function calcularComplexidadeEletrica(input: {
  area: number;
  unidades: number;
  pecas: number;
  circuitos: number;
  circuitosUnicos: number;
  revisao: number;
  tier: number | null;
  kitQdc: boolean;
  tipoEstrutura: string | null;
  metodoConstrutivo: string | null;
  tiposInstalacao: string;
}): number {
  // Heurística v1. A quantidade de unidades entra em log2 para refletir
  // ganho de escala: 100 apartamentos repetidos não viram 100x o esforço.
  const score =
    8 +
    Math.min(14, input.area / 7) +
    Math.min(25, input.pecas * 0.65) +
    Math.min(22, input.circuitos * 0.28) +
    Math.min(8, input.circuitosUnicos * 1.1) +
    Math.min(6, Math.log2(Math.max(1, input.unidades) + 1) * 1.15) +
    Math.min(5, Math.max(0, input.revisao - 1) * 1.5) +
    bonusTier(input.tier) +
    (input.kitQdc ? 3 : 0) +
    bonusEstrutura(input.tipoEstrutura, input.metodoConstrutivo, input.tiposInstalacao);
  return Math.max(1, Math.min(100, Math.round(score)));
}

export function calcularComplexidadeHidraulica(input: {
  area: number;
  unidades: number;
  itens: number;
  variedadeItens: number;
  subtipo: string;
  tier: number | null;
  tipoEstrutura: string | null;
  metodoConstrutivo: string | null;
}): number {
  const bonusSubtipo = input.subtipo === "ESGOTO" ? 8 : input.subtipo === "AGUA_QUENTE" ? 7 : input.subtipo === "PEX" ? 6 : 4;
  const score =
    8 +
    Math.min(16, input.area / 6) +
    Math.min(30, input.itens * 0.9) +
    Math.min(14, input.variedadeItens * 1.6) +
    Math.min(7, Math.log2(Math.max(1, input.unidades) + 1) * 1.25) +
    bonusSubtipo +
    bonusTier(input.tier) +
    bonusEstrutura(input.tipoEstrutura, input.metodoConstrutivo, "[]");
  return Math.max(1, Math.min(100, Math.round(score)));
}

export function calcularComplexidadeMateriais(input: {
  area: number;
  unidades: number;
  itens: number;
  variedade: number;
  tier: number | null;
}): number {
  const score =
    6 +
    Math.min(12, input.area / 8) +
    Math.min(38, input.itens * 0.8) +
    Math.min(18, input.variedade * 1.3) +
    Math.min(7, Math.log2(Math.max(1, input.unidades) + 1) * 1.2) +
    bonusTier(input.tier);
  return Math.max(1, Math.min(100, Math.round(score)));
}
