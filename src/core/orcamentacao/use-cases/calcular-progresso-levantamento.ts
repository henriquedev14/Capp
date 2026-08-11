export interface TipologiaParaProgresso {
  temLevantamentoEletricoValidado: boolean;
  temLevantamentoMateriaisValidado: boolean;
  temLevantamentoHidraulicoValidado: boolean;
  nome: string;
}

export interface ProgressoLevantamento {
  eletricoValidados: number;
  eletricoTotal: number;
  materiaisValidados: number;
  materiaisTotal: number;
  hidraulicoValidados: number;
  hidraulicoTotal: number;
  completo: boolean;
  /** Nenhuma tipologia com nada validado ainda. */
  naoIniciado: boolean;
}

/**
 * Progresso GRANULAR do levantamento — quantas tipologias já têm cada
 * tipo validado, em vez do "tudo ou nada" de verificarGateOrcamentacao
 * (que só serve pra saber se PODE avançar, não pra mostrar progresso
 * real). Achado pelo Henrique em 10/08/2026: a Engenharia mostrava
 * "não iniciado" pra itens que já tinham boa parte do levantamento
 * pronto, só porque faltava validar 1 tipologia de 5.
 */
export function calcularProgressoLevantamento(
  tipologias: TipologiaParaProgresso[],
  kitEletrico: boolean,
  kitHidraulico: boolean
): ProgressoLevantamento {
  const relevantesEletrico = tipologias;
  const relevantesHidraulico = tipologias.filter((t) => t.nome !== "Hall");

  const eletricoValidados = kitEletrico
    ? relevantesEletrico.filter((t) => t.temLevantamentoEletricoValidado).length
    : 0;
  const eletricoTotal = kitEletrico ? relevantesEletrico.length : 0;

  const materiaisValidados = kitEletrico
    ? relevantesEletrico.filter((t) => t.temLevantamentoMateriaisValidado).length
    : 0;
  const materiaisTotal = kitEletrico ? relevantesEletrico.length : 0;

  const hidraulicoValidados = kitHidraulico
    ? relevantesHidraulico.filter((t) => t.temLevantamentoHidraulicoValidado).length
    : 0;
  const hidraulicoTotal = kitHidraulico ? relevantesHidraulico.length : 0;

  const completo =
    (!kitEletrico || (eletricoValidados === eletricoTotal && materiaisValidados === materiaisTotal)) &&
    (!kitHidraulico || hidraulicoValidados === hidraulicoTotal);

  const naoIniciado =
    eletricoValidados === 0 && materiaisValidados === 0 && hidraulicoValidados === 0;

  return {
    eletricoValidados,
    eletricoTotal,
    materiaisValidados,
    materiaisTotal,
    hidraulicoValidados,
    hidraulicoTotal,
    completo,
    naoIniciado,
  };
}
