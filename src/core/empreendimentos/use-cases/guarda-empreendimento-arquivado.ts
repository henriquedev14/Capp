/**
 * [CORREÇÃO C2/C3.1] Guarda centralizada — impede operações em
 * empreendimento arquivado. Reutilizada por todas as actions que criam
 * ou avançam algo vinculado a um Empreendimento (orçamento, levantamento,
 * cotação, remessa, documento, avanço de etapa, etc.), em vez de cada
 * arquivo duplicar sua própria checagem de `excluidoEm`.
 *
 * Lógica pura (sem I/O) — o fetch do empreendimento é feito por quem
 * chama (ver `infra/db/guardas/verificar-empreendimento-ativo.ts` pro
 * wrapper que já busca no banco).
 */

export interface ResultadoGuardaEmpreendimento {
  permitido: boolean;
  motivo?: string;
}

const MENSAGEM_NAO_ENCONTRADO = "Empreendimento não encontrado.";
const MENSAGEM_ARQUIVADO =
  "Este empreendimento está arquivado. Restaure-o antes de realizar esta operação.";

export function verificarEmpreendimentoNaoArquivado(
  empreendimento: { excluidoEm?: Date | null } | null
): ResultadoGuardaEmpreendimento {
  if (!empreendimento) {
    return { permitido: false, motivo: MENSAGEM_NAO_ENCONTRADO };
  }
  if (empreendimento.excluidoEm) {
    return { permitido: false, motivo: MENSAGEM_ARQUIVADO };
  }
  return { permitido: true };
}
