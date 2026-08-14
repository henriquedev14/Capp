/**
 * Valor unitário POR UNIDADE-BASE do contrato no Modo Legado — regra
 * centralizada, usada por Cadastro, Vida do Empreendimento, Produção
 * e Financeiro. Fonte única: valor total do contrato + quantidade-base
 * de unidades. Nunca Contas a Receber, remessas, faturado, recebido,
 * produzido ou entregue. Desenhado com o Henrique em 13/08/2026.
 *
 * baseValorKits           = valorContratado × 0,80  (80% do contrato vai pros kits)
 * valorUnitarioBaseContrato = baseValorKits / quantidadeBaseUnidades
 *
 * IMPORTANTE — o nome não é acidente: isto é o valor médio por
 * UNIDADE-BASE (apartamento), não o valor de CADA TIPO de kit
 * separadamente. Se o mesmo apartamento tem Elétrico + QDC +
 * Hidráulico, NÃO atribua esse valor a cada um dos três — isso
 * multiplicaria o valor do contrato artificialmente (3× o que
 * realmente foi contratado). Só faz sentido valorar cada kit
 * separadamente se um dia existir rateio/valor contratual específico
 * por kit (ver KitLegado.valorContratoEspecifico).
 *
 * quantidadeBaseUnidades é a quantidade de apartamentos/unidades que o
 * CONTRATO atende — não a soma das quantidades de cada tipo de kit.
 */
const PERCENTUAL_DESTINADO_AOS_KITS = 0.8;

export function calcularValorUnitarioBaseContratoLegado(
  valorContratado: number | null | undefined,
  quantidadeBaseUnidades: number | null | undefined
): number | null {
  if (!valorContratado || !quantidadeBaseUnidades || quantidadeBaseUnidades <= 0) return null;
  const baseValorKits = valorContratado * PERCENTUAL_DESTINADO_AOS_KITS;
  return Math.round((baseValorKits / quantidadeBaseUnidades) * 100) / 100;
}
