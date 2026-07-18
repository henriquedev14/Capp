// ============================================================================
// ⚠️ CONFIGURAÇÃO PROVISÓRIA — AGUARDANDO CONFIRMAÇÃO DO HENRIQUE ⚠️
//
// Os nomes de material abaixo são um CHUTE baseado no catálogo que existia
// no seed original (src/infra/db/prisma/seed-materiais-eletrico.ts). NÃO
// foram confirmados linha por linha para cada um dos 6 tipos de estrutura.
//
// Assim que a tabela real chegar (tipo de estrutura × faixa de cabos →
// nome exato do material), é só substituir os valores abaixo — é o ÚNICO
// lugar que precisa mudar, nada mais no sistema depende de outro lugar.
//
// Regra atual (PROVISÓRIA): até 5 cabos no ponto = caixa menor; 6+ cabos =
// caixa maior. Ajustar LIMITE_CABOS se o corte real for diferente.
// ============================================================================

import type { TipoEstrutura } from "@/core/empreendimentos/entities/empreendimento";

export const LIMITE_CABOS_CAIXA_MAIOR = 5; // "mais de 5" = 6, 7, 8...

interface ConfigCaixaTeto {
  ateOLimite: string; // nome exato do material no catálogo
  acimaDoLimite: string;
}

export const CAIXA_TETO_POR_ESTRUTURA: Record<TipoEstrutura, ConfigCaixaTeto> = {
  CONCRETO_ARMADO: {
    ateOLimite: "Caixa Teto - 6 posições",
    acimaDoLimite: "Caixa Teto - 6 posições", // ⚠️ PROVISÓRIO: não existe variante "10" no catálogo ainda
  },
  ALVENARIA_ESTRUTURAL: {
    ateOLimite: "Caixa Teto - 6 posições", // ⚠️ PROVISÓRIO — confirmar nome real
    acimaDoLimite: "Caixa Teto - 6 posições", // ⚠️ PROVISÓRIO
  },
  PAREDE_DE_CONCRETO: {
    ateOLimite: "Caixa Teto - 6 posições", // ⚠️ PROVISÓRIO — confirmar nome real
    acimaDoLimite: "Caixa Teto - 6 posições", // ⚠️ PROVISÓRIO
  },
  ESTRUTURA_METALICA: {
    ateOLimite: "Caixa Teto - 6 posições", // ⚠️ PROVISÓRIO — confirmar nome real
    acimaDoLimite: "Caixa Teto - 6 posições", // ⚠️ PROVISÓRIO
  },
  STEEL_FRAME: {
    ateOLimite: "Caixa 4x2 Drywall", // ⚠️ PROVISÓRIO — é caixa de PAREDE, não de TETO; confirmar item de teto pra drywall
    acimaDoLimite: "Caixa 4x2 Drywall", // ⚠️ PROVISÓRIO
  },
  WOOD_FRAME: {
    ateOLimite: "Caixa 4x2 Drywall", // ⚠️ PROVISÓRIO — mesmo caso do Steel Frame
    acimaDoLimite: "Caixa 4x2 Drywall", // ⚠️ PROVISÓRIO
  },
};

export function nomeMaterialCaixaTeto(
  tipoEstrutura: TipoEstrutura,
  quantidadeCabos: number
): string {
  const config = CAIXA_TETO_POR_ESTRUTURA[tipoEstrutura];
  return quantidadeCabos > LIMITE_CABOS_CAIXA_MAIOR ? config.acimaDoLimite : config.ateOLimite;
}
