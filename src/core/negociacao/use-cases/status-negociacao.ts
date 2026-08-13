export interface InteracaoParaStatus {
  tipo: string;
  createdAt: Date;
  proximaAcaoData: Date | null;
}

export type StatusNegociacao =
  | "AGUARDANDO_CLIENTE"
  | "EM_REVISAO"
  | "APROVADA"
  | "RECUSADA"
  | "RETORNOU_ENGENHARIA";

export type PrioridadeNegociacao = "normal" | "atencao" | "critica";

/**
 * Deriva o status ATUAL da negociação a partir da última interação —
 * de propósito não existe um campo de status redundante, pra nunca
 * dessincronizar do histórico de verdade. Desenhado em 08/08/2026
 * (docs/negociacao-desenho-v2.md).
 */
export function derivarStatusNegociacao(interacoes: InteracaoParaStatus[]): StatusNegociacao {
  if (interacoes.length === 0) return "AGUARDANDO_CLIENTE";

  const ultima = interacoes.reduce((mais, atual) => (atual.createdAt > mais.createdAt ? atual : mais));

  switch (ultima.tipo) {
    case "GANHA":
      return "APROVADA";
    case "PERDIDA":
      return "RECUSADA";
    case "RETORNO_ENGENHARIA":
      return "RETORNOU_ENGENHARIA";
    case "CONTRAPROPOSTA":
      return "EM_REVISAO";
    // Reverter uma aprovação volta a negociação pra EM_REVISAO — não
    // pro zero (AGUARDANDO_CLIENTE), já que a conversa com o cliente
    // já estava adiantada. Pedido pelo Henrique em 13/08/2026.
    case "APROVACAO_REVERTIDA":
      return "EM_REVISAO";
    default:
      return "AGUARDANDO_CLIENTE";
  }
}

/**
 * Prioridade visual do hub — pensada pra responder "quem eu preciso
 * contatar hoje" em poucos segundos, sem poluir com alerta demais.
 * Limites confirmados com o Henrique em 08/08/2026: 3 dias = normal,
 * 4-7 = atenção, 7+ (ou follow-up vencido) = crítica.
 */
export function calcularPrioridade(
  interacoes: InteracaoParaStatus[],
  agora: Date = new Date()
): { prioridade: PrioridadeNegociacao; diasSemInteracao: number; followUpVencido: boolean; proximaAcaoData: Date | null } {
  if (interacoes.length === 0) {
    return { prioridade: "normal", diasSemInteracao: 0, followUpVencido: false, proximaAcaoData: null };
  }

  const ultima = interacoes.reduce((mais, atual) => (atual.createdAt > mais.createdAt ? atual : mais));
  const diasSemInteracao = Math.floor((agora.getTime() - ultima.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const followUpVencido = ultima.proximaAcaoData != null && ultima.proximaAcaoData < agora;

  let prioridade: PrioridadeNegociacao;
  if (followUpVencido || diasSemInteracao > 7) prioridade = "critica";
  else if (diasSemInteracao >= 4) prioridade = "atencao";
  else prioridade = "normal";

  return { prioridade, diasSemInteracao, followUpVencido, proximaAcaoData: ultima.proximaAcaoData };
}
