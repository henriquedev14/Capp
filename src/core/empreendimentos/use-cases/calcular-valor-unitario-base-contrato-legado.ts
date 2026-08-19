/**
 * Valor unitário POR UNIDADE-BASE do contrato no Modo Legado — regra
 * centralizada, usada hoje pelo Cadastro (ModoLegadoCard,
 * CadastroLegadoForm) e, a partir de 19/08/2026, também pela Vida
 * Financeira (ver calcularValorEstimadoPorKitLegado abaixo). Fonte
 * única: valor total do contrato + quantidade-base de unidades. Nunca
 * Contas a Receber, remessas, faturado, recebido, produzido ou
 * entregue. Desenhado com o Henrique em 13/08/2026.
 *
 * baseValorKits           = valorContratado × 0,80  (80% do contrato vai pros kits —
 *                            equivalente a "contratado menos 20% de entrada")
 * valorUnitarioBaseContrato = baseValorKits / quantidadeBaseUnidades
 *
 * IMPORTANTE — o nome não é acidente: isto é o valor médio por
 * UNIDADE-BASE (apartamento), não o valor de CADA TIPO de kit
 * separadamente. Se o mesmo apartamento tem Elétrico + QDC +
 * Hidráulico, NÃO atribua esse valor a cada um dos três — isso
 * multiplicaria o valor do contrato artificialmente (3× o que
 * realmente foi contratado). Pra valor por TIPO de kit, use
 * calcularValorEstimadoPorKitLegado.
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

export interface ValorEstimadoKitLegado {
  kit: string;
  quantidadeContratada: number;
  valorEstimado: number;
  /** "informado": veio de KitLegado.valorContratoEspecifico (real, negociado por kit).
   *  "estimado": não havia valor específico — rateado do pool de 80% proporcionalmente
   *  à quantidade contratada desse kit em relação ao total. */
  origem: "informado" | "estimado";
}

/**
 * Valor estimado POR TIPO DE KIT (Elétrico/Hidráulico/QDC) — pedido
 * pelo Henrique em 19/08/2026 pra aparecer na Vida Financeira. Ao
 * contrário de calcularValorUnitarioBaseContratoLegado (um valor médio
 * só, por apartamento), esta função reparte o mesmo pool de 80% do
 * contrato ENTRE os tipos de kit, sem contar o total 3× — a soma de
 * `valorEstimado` de todos os kits retornados bate exatamente com
 * `valorContratado × 0,80` (nunca mais que isso).
 *
 * Regra:
 *   1. Kit com `valorContratoEspecifico` preenchido (contrato
 *      realmente dividido por kit) usa esse valor direto — é dado
 *      real, não estimativa.
 *   2. O que sobra do pool de 80% depois de tirar os valores reais do
 *      passo 1 é rateado entre os kits SEM valor específico,
 *      proporcionalmente à quantidadeContratada de cada um.
 *
 * Premissa assumida (sem outro sinal de custo no modelo hoje): kits
 * sem valor específico valem o mesmo por unidade entre si — o rateio
 * é só por quantidade, não por complexidade/custo do tipo de kit. Se
 * um tipo de kit custar sistematicamente mais que outro, o jeito
 * certo de refletir isso é preenchendo valorContratoEspecifico
 * (passo 1), não ajustar esta função.
 */
export function calcularValorEstimadoPorKitLegado(
  valorContratado: number | null | undefined,
  kits: Array<{ kit: string; quantidadeContratada: number; valorContratoEspecifico?: number | null }>
): ValorEstimadoKitLegado[] {
  if (!valorContratado || kits.length === 0) return [];

  const baseValorKits = valorContratado * PERCENTUAL_DESTINADO_AOS_KITS;
  const temValorReal = (k: (typeof kits)[number]) => k.valorContratoEspecifico != null && k.valorContratoEspecifico > 0;

  const somaValorReal = kits.filter(temValorReal).reduce((s, k) => s + (k.valorContratoEspecifico ?? 0), 0);
  const poolRestanteCentavos = Math.round(Math.max(0, baseValorKits - somaValorReal) * 100);
  const semValorReal = kits.filter((k) => !temValorReal(k));
  const somaQuantidadesSemValorReal = semValorReal.reduce((s, k) => s + k.quantidadeContratada, 0);

  // Rateio do pool restante em CENTAVOS INTEIROS pelo método do maior
  // resto (largest remainder) — sem isso, arredondar cada linha
  // separadamente pode deixar a soma 1 centavo acima ou abaixo do
  // pool (achado rodando o teste real em 19/08/2026: 3 kits de
  // R$266.666,666... arredondados cada um pra R$266.666,67 somam
  // R$800.000,01, um centavo a mais que o contrato permite).
  const partes = semValorReal.map((k) => {
    const exato = somaQuantidadesSemValorReal > 0 ? (poolRestanteCentavos * k.quantidadeContratada) / somaQuantidadesSemValorReal : 0;
    return { k, centavos: Math.floor(exato), resto: exato - Math.floor(exato) };
  });
  let sobra = poolRestanteCentavos - partes.reduce((s, p) => s + p.centavos, 0);
  for (const p of [...partes].sort((a, b) => b.resto - a.resto)) {
    if (sobra <= 0) break;
    p.centavos += 1;
    sobra--;
  }
  const centavosPorKit = new Map(partes.map((p) => [p.k, p.centavos]));

  return kits.map((k) => {
    if (temValorReal(k)) {
      return {
        kit: k.kit,
        quantidadeContratada: k.quantidadeContratada,
        valorEstimado: Math.round((k.valorContratoEspecifico as number) * 100) / 100,
        origem: "informado" as const,
      };
    }
    return {
      kit: k.kit,
      quantidadeContratada: k.quantidadeContratada,
      valorEstimado: (centavosPorKit.get(k) ?? 0) / 100,
      origem: "estimado" as const,
    };
  });
}
