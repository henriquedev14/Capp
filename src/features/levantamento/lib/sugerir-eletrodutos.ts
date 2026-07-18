// Agrega metragem de eletroduto por diâmetro, a partir das Peças do
// Levantamento Elétrico validado — mesma técnica já usada em sugerir-cabos,
// só que aqui a métrica soma o comprimento FÍSICO da peça (todos os
// trechos: descidas, laje, horizontal, subidas) + a sobra técnica, não a
// metragem de cabo (que multiplica por circuito).

export interface PecaEletroduto {
  diametro: string; // ex: "3/4\"", "1\"", "1.1/4\""
  vertical1: number;
  laje1: number;
  horiz: number;
  laje2: number;
  vertical2: number;
  sobra: number;
}

export interface SugestaoEletroduto {
  diametro: string;
  metros: number;
}

export function sugerirEletrodutos(pecas: PecaEletroduto[]): SugestaoEletroduto[] {
  const soma = new Map<string, number>();

  for (const peca of pecas) {
    const comprimentoTotal =
      peca.vertical1 + peca.laje1 + peca.horiz + peca.laje2 + peca.vertical2 + peca.sobra;
    soma.set(peca.diametro, (soma.get(peca.diametro) ?? 0) + comprimentoTotal);
  }

  return Array.from(soma.entries())
    .map(([diametro, metros]) => ({ diametro, metros: Math.round(metros * 100) / 100 }))
    .sort((a, b) => a.diametro.localeCompare(b.diametro));
}
