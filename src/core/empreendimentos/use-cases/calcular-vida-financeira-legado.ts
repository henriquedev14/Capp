/**
 * Vida Financeira do Modo Legado — regra centralizada.
 *
 * IMPORTANTE — achado pelo Henrique em 13/08/2026: ContaReceber não
 * representa necessariamente algo já faturado — é um título/previsão
 * (nasce com dataPrevista, pode estar pendente por muito tempo antes
 * de virar receita de fato). Chamar a soma das Contas a Receber de
 * "Faturado" seria conceitualmente falso.
 *
 * Por isso esta função separa:
 *   - faturadoHistoricoReal: só o histórico digitado no cadastro
 *     (legadoFaturadoHistorico) — isso SIM é faturamento real, que já
 *     aconteceu antes do ERP existir.
 *   - previstoAReceberPosErp: soma das Contas a Receber lançadas
 *     depois no sistema — são títulos/previsão, não necessariamente
 *     já faturados. O dashboard deve rotular isso como "Títulos
 *     gerados" ou "Previsto a receber", nunca "Faturado".
 *   - recebidoTotal: esse sim é seguro somar (histórico + baixas
 *     reais, `recebido: true` é um evento concreto, não previsão).
 */
export interface DadosVidaFinanceiraLegado {
  valorContratado: number | null;
  faturadoHistorico: number | null;
  recebidoHistorico: number | null;
  contasReceber: Array<{ valor: number; recebido: boolean }>;
}

export interface VidaFinanceiraLegado {
  valorContratado: number;
  faturadoHistoricoReal: number;
  previstoAReceberPosErp: number;
  recebidoTotal: number;
  saldoAReceber: number;
}

export function calcularVidaFinanceiraLegado(dados: DadosVidaFinanceiraLegado): VidaFinanceiraLegado {
  const valorContratado = dados.valorContratado ?? 0;
  const previstoAReceberPosErp = dados.contasReceber.reduce((s, c) => s + c.valor, 0);
  const recebidoPosErp = dados.contasReceber.filter((c) => c.recebido).reduce((s, c) => s + c.valor, 0);
  const recebidoTotal = (dados.recebidoHistorico ?? 0) + recebidoPosErp;

  return {
    valorContratado,
    faturadoHistoricoReal: dados.faturadoHistorico ?? 0,
    previstoAReceberPosErp,
    recebidoTotal,
    saldoAReceber: valorContratado - recebidoTotal,
  };
}
