// Agrega metragem de cabo por bitola+cor a partir das Peças/Circuitos do
// Levantamento Elétrico validado — mesma lógica já validada 100% contra a
// planilha real (ver histórico em importar-planilha-parametros.ts).

export interface PecaComCircuitos {
  horiz: number; // distância total da peça (já inclui vertical+horizontal+sobra)
  circuitos: {
    bitola: number;
    temVermelho: boolean;
    temPreto: boolean;
    temAzul: boolean;
    temVerde: boolean;
    temAmarelo: boolean;
    temBranco: boolean;
  }[];
}

export interface SugestaoCabo {
  bitola: number;
  cor: "vermelho" | "preto" | "azul" | "verde" | "amarelo" | "branco";
  metros: number;
}

const CORES: Array<SugestaoCabo["cor"]> = [
  "vermelho",
  "preto",
  "azul",
  "verde",
  "amarelo",
  "branco",
];

function flagDaCor(circuito: PecaComCircuitos["circuitos"][number], cor: SugestaoCabo["cor"]): boolean {
  switch (cor) {
    case "vermelho": return circuito.temVermelho;
    case "preto": return circuito.temPreto;
    case "azul": return circuito.temAzul;
    case "verde": return circuito.temVerde;
    case "amarelo": return circuito.temAmarelo;
    case "branco": return circuito.temBranco;
  }
}

export function sugerirCabos(pecas: PecaComCircuitos[]): SugestaoCabo[] {
  const soma = new Map<string, number>(); // chave: "bitola|cor"

  for (const peca of pecas) {
    for (const circuito of peca.circuitos) {
      for (const cor of CORES) {
        if (flagDaCor(circuito, cor)) {
          const chave = `${circuito.bitola}|${cor}`;
          soma.set(chave, (soma.get(chave) ?? 0) + peca.horiz);
        }
      }
    }
  }

  return Array.from(soma.entries())
    .map(([chave, metros]) => {
      const [bitolaStr, cor] = chave.split("|");
      return { bitola: parseFloat(bitolaStr ?? "0"), cor: cor as SugestaoCabo["cor"], metros: Math.round(metros * 100) / 100 };
    })
    .sort((a, b) => a.bitola - b.bitola || a.cor.localeCompare(b.cor));
}
