/**
 * Valida se o orçamento tem tudo que precisa antes de gerar a Proposta
 * Comercial. Função pura — extraída de renderizar-proposta.tsx na Tarefa
 * 2.1.4 (PropostaService).
 */
export function validarCamposObrigatoriosProposta(input: {
  clienteEncontrado: boolean;
  totalMaoDeObra: number;
  totalMateriais: number;
}): string | null {
  if (!input.clienteEncontrado) return "Cliente não encontrado para este empreendimento.";
  if (input.totalMaoDeObra <= 0) {
    return "Este orçamento não tem valor de mão de obra calculado — verifique o Orçamento (Bloco 1).";
  }
  if (input.totalMateriais <= 0) {
    return "Este orçamento não tem valor de materiais calculado — verifique o Orçamento (Bloco 2).";
  }
  return null;
}
