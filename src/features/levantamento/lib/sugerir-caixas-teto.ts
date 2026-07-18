// ⚠️ Ver o aviso de "config provisória" em caixa-teto-config.ts antes de
// usar isto em produção de verdade.

import { nomeMaterialCaixaTeto } from "./caixa-teto-config";
import type { TipoEstrutura } from "@/core/empreendimentos/entities/empreendimento";

export interface PecaParaSugestao {
  trecho: string; // ex: "L1-L2", "QDC-L1", "L3+L8"
  quantidadeCircuitos: number; // quantos fios/circuitos passam nesta peça
}

export interface SugestaoCaixaTeto {
  ponto: string; // ex: "L8"
  quantidadeCabos: number;
  materialSugerido: string;
}

// Extrai os "pontos" de um trecho — aceita tanto "-" quanto "+" como
// separador (a planilha usa os dois: "L1-L2" pra sequência, "L3+L8" pra
// bifurcação/par).
function extrairPontos(trecho: string): string[] {
  return trecho
    .split(/[-+]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Conta quantos cabos passam por cada ponto de TETO (código começando com
 * "L") e sugere o material de caixa correspondente, conforme a regra
 * PROVISÓRIA em caixa-teto-config.ts.
 *
 * "Quantidade de cabos no ponto" = soma de circuitos de todas as peças
 * (trechos) que tocam aquele ponto, como origem ou destino.
 */
export function sugerirCaixasTeto(
  pecas: PecaParaSugestao[],
  tipoEstrutura: TipoEstrutura
): SugestaoCaixaTeto[] {
  const cabosPorPonto = new Map<string, number>();

  for (const peca of pecas) {
    const pontos = extrairPontos(peca.trecho);
    for (const ponto of pontos) {
      // Só pontos de teto — "L" seguido de número (ex: L1, L23). Ignora
      // QDC, T (tomada/interruptor) e qualquer outro prefixo.
      if (!/^L\d+$/i.test(ponto)) continue;
      const atual = cabosPorPonto.get(ponto) ?? 0;
      cabosPorPonto.set(ponto, atual + peca.quantidadeCircuitos);
    }
  }

  return Array.from(cabosPorPonto.entries())
    .sort(([a], [b]) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      return na - nb;
    })
    .map(([ponto, quantidadeCabos]) => ({
      ponto,
      quantidadeCabos,
      materialSugerido: nomeMaterialCaixaTeto(tipoEstrutura, quantidadeCabos),
    }));
}
