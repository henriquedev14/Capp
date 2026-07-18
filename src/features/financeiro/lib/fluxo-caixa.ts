/**
 * Projeta o saldo de caixa semana a semana, cruzando o que está previsto
 * pra entrar (Contas a Receber não recebidas) com o que está previsto pra
 * sair (Contas a Pagar não pagas) — a peça que faltava pra fechar o ciclo
 * do módulo Financeiro (ver estudo original: seção 3.3).
 */

export interface MovimentoPrevisto {
  data: Date;
  valor: number;
}

export interface SemanaProjetada {
  inicio: Date;
  fim: Date;
  label: string; // ex: "07 a 13/07"
  entradas: number;
  saidas: number;
  saldoSemana: number;
  saldoAcumulado: number;
}

/**
 * Agrupa entradas/saídas em semanas (domingo a sábado) a partir de hoje,
 * pelas próximas `numSemanas` semanas, e calcula o saldo acumulado
 * começando do `saldoInicial` informado.
 */
export function projetarFluxoCaixa({
  entradas,
  saidas,
  saldoInicial,
  numSemanas = 8,
  hoje = new Date(),
}: {
  entradas: MovimentoPrevisto[];
  saidas: MovimentoPrevisto[];
  saldoInicial: number;
  numSemanas?: number;
  hoje?: Date;
}): SemanaProjetada[] {
  const inicioSemana0 = new Date(hoje);
  inicioSemana0.setHours(0, 0, 0, 0);
  inicioSemana0.setDate(inicioSemana0.getDate() - inicioSemana0.getDay()); // volta pro domingo

  const semanas: SemanaProjetada[] = [];
  let saldoAcumulado = saldoInicial;

  for (let i = 0; i < numSemanas; i++) {
    const inicio = new Date(inicioSemana0);
    inicio.setDate(inicio.getDate() + i * 7);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
    fim.setHours(23, 59, 59, 999);

    const entradasSemana = entradas
      .filter((e) => e.data >= inicio && e.data <= fim)
      .reduce((s, e) => s + e.valor, 0);
    const saidasSemana = saidas
      .filter((s) => s.data >= inicio && s.data <= fim)
      .reduce((s, e) => s + e.valor, 0);

    const saldoSemana = entradasSemana - saidasSemana;
    saldoAcumulado += saldoSemana;

    const formatarData = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    semanas.push({
      inicio,
      fim,
      label: `${formatarData(inicio)} a ${formatarData(fim)}`,
      entradas: entradasSemana,
      saidas: saidasSemana,
      saldoSemana,
      saldoAcumulado,
    });
  }

  return semanas;
}

export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

/**
 * Classifica a urgência de uma conta a pagar — mesma lógica que a aba
 * "EM ABERTO - VENCIDOS" fazia manualmente (agrupar por faixa e decidir o
 * que pagar primeiro), agora automática:
 *  - ALTA: já vencida, ou vence em até 3 dias
 *  - MEDIA: vence entre 4 e 10 dias
 *  - BAIXA: vence depois disso
 */
export function calcularPrioridade(dataVencimento: Date, hoje: Date = new Date()): Prioridade {
  const hojeZerado = new Date(hoje);
  hojeZerado.setHours(0, 0, 0, 0);
  const dias = Math.floor((dataVencimento.getTime() - hojeZerado.getTime()) / (1000 * 60 * 60 * 24));

  if (dias <= 3) return "ALTA";
  if (dias <= 10) return "MEDIA";
  return "BAIXA";
}
