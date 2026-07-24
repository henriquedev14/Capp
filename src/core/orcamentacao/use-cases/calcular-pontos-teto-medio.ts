export interface PontosPorTipologia {
  tipologiaId: string;
  pontos: number;
  quantidadeUnidades: number;
}

/**
 * Calcula a média de pontos de teto por apartamento do EMPREENDIMENTO
 * INTEIRO — não por tipologia individual.
 *
 * Decisão de negócio confirmada com o Henrique em 24/07/2026 (Tarefa
 * 2.1.3): o processo real é o cliente receber um preço ÚNICO para o
 * empreendimento inteiro, não um preço variando por tipologia. Antes
 * dessa correção, o sistema calculava um preço diferente por tipologia
 * (comportamento divergente do processo real, corrigido aqui).
 *
 * Fórmula:
 *   total de pontos = soma de (pontos da tipologia × qtd de unidades dela)
 *   total de apartamentos = soma da qtd de unidades de todas as tipologias
 *   média = total de pontos ÷ total de apartamentos
 *
 * Essa média é aplicada à MESMA fórmula de preço (valorMinimo +
 * excedente × valorPorPontoExtra) que antes rodava por tipologia — agora
 * roda uma vez só, e o resultado vale igual para todo o empreendimento.
 */
export function calcularPontosMedioPorApartamento(itens: PontosPorTipologia[]): number {
  const totalApartamentos = itens.reduce((acc, i) => acc + i.quantidadeUnidades, 0);
  if (totalApartamentos === 0) return 0;

  const totalPontos = itens.reduce((acc, i) => acc + i.pontos * i.quantidadeUnidades, 0);
  return totalPontos / totalApartamentos;
}
