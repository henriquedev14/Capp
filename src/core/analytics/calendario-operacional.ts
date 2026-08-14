/**
 * Calendário operacional compartilhado pelo Analytics.
 *
 * Hoje o ConstruApp ainda não possui cadastro de feriados/turnos por unidade,
 * então a fonte mais honesta é segunda a sexta. Centralizar aqui evita que
 * cada dashboard use uma definição diferente de "dia".
 */
export function ehDiaUtil(data: Date): boolean {
  const dia = data.getDay();
  return dia !== 0 && dia !== 6;
}

export function contarDiasUteis(inicio: Date, fimExclusivo: Date): number {
  if (fimExclusivo <= inicio) return 0;
  const cursor = new Date(inicio);
  cursor.setHours(0, 0, 0, 0);
  const fim = new Date(fimExclusivo);
  fim.setHours(0, 0, 0, 0);

  let total = 0;
  while (cursor < fim) {
    if (ehDiaUtil(cursor)) total++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

export function diasUteisEntre(inicio: Date, fim: Date): number {
  if (fim <= inicio) return 0;
  // Lead/aging mede dias úteis DECORRIDOS: o dia de entrada é zero e cada
  // dia útil posterior concluído acrescenta 1. Preserva a semântica que a
  // Engenharia já usava antes da centralização (sexta → segunda = 1).
  const atual = new Date(inicio);
  atual.setHours(0, 0, 0, 0);
  const fimSemHora = new Date(fim);
  fimSemHora.setHours(0, 0, 0, 0);
  let total = 0;
  while (atual < fimSemHora) {
    atual.setDate(atual.getDate() + 1);
    if (ehDiaUtil(atual)) total++;
  }
  return total;
}

export function inicioDoDia(data = new Date()): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}
