export interface PavimentoParaCronograma {
  dataPrevistaRemessa: Date | string | null;
}

/**
 * Verifica se o Cronograma da Obra está 100% preenchido — TODO
 * pavimento do empreendimento precisa ter data prevista de remessa,
 * não só os que a remessa específica cobre. Decisão confirmada com o
 * Henrique em 10/08/2026 (item 1 da Jornada do Orçamento).
 *
 * Empreendimento sem pavimento nenhum cadastrado conta como completo
 * (nada pra preencher) — evita travar por engano em casos de teste ou
 * cadastro simplificado.
 */
export function verificarCronogramaCompleto(pavimentos: PavimentoParaCronograma[]): boolean {
  if (pavimentos.length === 0) return true;
  return pavimentos.every((p) => p.dataPrevistaRemessa != null);
}
