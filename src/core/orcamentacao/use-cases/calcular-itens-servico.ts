import type { Tipologia } from "@/core/empreendimentos/entities/estrutura-fisica";
import type { TabelaPrecoBase } from "@/core/orcamentacao/entities/orcamento";

export type KitContratado = "ELETRICO" | "HIDRAULICO" | "QDC";

export interface ItemServicoCalculado {
  tipologiaId: string;
  tipologiaNome: string;
  kit: KitContratado;
  quantidade: number; // nº de unidades com esta tipologia
  precoBase: number;
  multiplicador: number;
  precoUnitario: number; // precoBase × multiplicador
  total: number; // precoUnitario × quantidade
  /** Faltou faixa na tabela de preços para esta tipologia/área */
  semPreco?: boolean;
  /** Levantamento técnico ainda não validado — valor é estimado pela
   * tabela de preço (área × tier), não por medição de campo confirmada. */
  simulado?: boolean;
}

/**
 * Calcula os itens de serviço HGI para um orçamento.
 *
 * Regras:
 * - Um item por tipologia × kit contratado — SEMPRE aparece, mesmo sem
 *   levantamento técnico validado. O valor da mão de obra vem da tabela de
 *   preço por faixa de área × multiplicador de tier — não depende de
 *   medição de campo, então não faz sentido esconder o item por causa
 *   disso. Quando o levantamento daquela tipologia/kit ainda não foi
 *   validado, o item vem marcado como `simulado: true` (estimativa) —
 *   isso é só informativo, não bloqueia nada.
 * - Preço base = faixa da TabelaPrecoBase que contém a areaPrivativa.
 *   Se a tipologia não tem área (null/0), usa a maior faixa disponível.
 * - precoUnitario = precoBase × multiplicadorTier.
 * - total = precoUnitario × quantidadeUnidades.
 *
 * (O Bloco 2 — Materiais — continua exigindo Levantamento de Materiais
 * validado antes de gerar a proposta; aqui é só o Bloco 1 — Serviço HGI.)
 */
export function calcularItensServico({
  tipologias,
  quantidadesPorTipologia,
  kitsContratados,
  kitsProntosPorTipologia,
  tabelaPreco,
  multiplicadorTier,
  criterio = "AREA",
  pontosTetoPorTipologia,
  formulaPontos,
}: {
  tipologias: Tipologia[];
  /** Map tipologiaId → total de unidades com essa tipologia */
  quantidadesPorTipologia: Map<string, number>;
  /** Kits contratados no empreendimento (independente de status do levantamento) */
  kitsContratados: KitContratado[];
  /** Map tipologiaId → kits com levantamento validado para essa tipologia (informativo) */
  kitsProntosPorTipologia: Map<string, KitContratado[]>;
  /** Tabela de faixas por ÁREA — não é mais usada no critério PONTOS_TETO
   * (que virou fórmula única, ver `formulaPontos`), só continua servindo
   * pro critério AREA original. */
  tabelaPreco: TabelaPrecoBase[];
  multiplicadorTier: number;
  /** Critério de precificação ativo globalmente no sistema */
  criterio?: "AREA" | "PONTOS_TETO";
  /** Map tipologiaId → quantidade de pontos de teto (só usado se criterio=PONTOS_TETO) */
  pontosTetoPorTipologia?: Map<string, number>;
  /** Parâmetros da fórmula do critério PONTOS_TETO — substituiu as 4
   * faixas antigas (Baixo/Médio/Alto/Altíssimo Padrão) por uma conta só:
   *   total = valorMinimo + max(0, pontos - pontosInclusos) * valorPorPontoExtra */
  formulaPontos?: { valorMinimo: number; pontosInclusos: number; valorPorPontoExtra: number };
}): ItemServicoCalculado[] {
  const itens: ItemServicoCalculado[] = [];
  const tabelaDoCriterio = tabelaPreco.filter((t) => t.criterio === "AREA");

  for (const tipologia of tipologias) {
    const quantidade = quantidadesPorTipologia.get(tipologia.id) ?? 0;
    if (quantidade === 0) continue;

    const kitsProntos = kitsProntosPorTipologia.get(tipologia.id) ?? [];

    // QDC ainda não tem módulo de levantamento próprio — segue de fora até
    // esse módulo existir, pra não inventar dado sem nenhuma base.
    for (const kit of kitsContratados.filter((k) => k !== "QDC")) {
      let precoBase: number;
      let precoUnitario: number;
      let semPreco = false;

      if (criterio === "PONTOS_TETO") {
        const pontos = pontosTetoPorTipologia?.get(tipologia.id) ?? 0;
        const f = formulaPontos ?? { valorMinimo: 550, pontosInclusos: 6, valorPorPontoExtra: 70 };
        precoBase = f.valorMinimo + Math.max(0, pontos - f.pontosInclusos) * f.valorPorPontoExtra;
        precoUnitario = parseFloat((precoBase * multiplicadorTier).toFixed(2));
      } else {
        const area = tipologia.areaPrivativa ?? 0;
        const faixa = buscarFaixa(tabelaDoCriterio, kit, area);
        precoBase = faixa?.precoBase ?? 0;
        precoUnitario = parseFloat((precoBase * multiplicadorTier).toFixed(2));
        semPreco = !faixa;
      }

      const simulado = !kitsProntos.includes(kit);
      // Sem levantamento validado pra esse kit/tipologia, o valor NÃO
      // entra no total — antes disso, o orçamento já contava o valor de
      // tipologias que a Engenharia ainda nem tinha confirmado o escopo
      // técnico, o que é dinheiro fantasma no total do cliente. O item
      // continua aparecendo na lista (com total=0), só pra visibilidade
      // de "isso está pendente", mas não soma em nada.
      const total = simulado ? 0 : parseFloat((precoUnitario * quantidade).toFixed(2));

      itens.push({
        tipologiaId: tipologia.id,
        tipologiaNome: tipologia.nome,
        kit,
        quantidade,
        precoBase,
        multiplicador: multiplicadorTier,
        precoUnitario,
        total,
        semPreco,
        simulado,
      });
    }
  }

  return itens;
}

function buscarFaixa(
  tabela: TabelaPrecoBase[],
  kit: string,
  referencia: number
): TabelaPrecoBase | null {
  const faixasKit = tabela.filter((t) => t.kit === kit);
  if (faixasKit.length === 0) return null;

  // Se referência = 0, pega a primeira faixa
  if (referencia === 0) return faixasKit[0] ?? null;

  // Faixa onde areaMin <= referencia < areaMax
  const exata = faixasKit.find((f) => f.areaMin <= referencia && referencia < f.areaMax);
  if (exata) return exata;

  // Fallback: maior faixa disponível (para valores acima do máximo da tabela)
  return faixasKit.reduce((prev, curr) =>
    curr.areaMax > prev.areaMax ? curr : prev
  );
}
