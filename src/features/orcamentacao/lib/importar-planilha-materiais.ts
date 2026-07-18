import * as XLSX from "xlsx";

export interface MaterialPlanilhaImportado {
  codigo: string;
  descricao: string;
  categoria: string;
  unidadeConsumo: string;
  quantidadeUnitaria: number;
  repeticoes: number;
  quantidadeTotal: number;
}

export interface ResultadoImportMateriais {
  linhas: MaterialPlanilhaImportado[];
  avisos: string[];
}

function texto(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function num(v: unknown): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const parsed = parseFloat(v.replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Nomes de coluna esperados na aba MATERIAL — comparação sempre
// maiúscula/sem espaço nas pontas, pra não quebrar por variação de
// capitalização entre planilhas.
const COLUNAS_ESPERADAS = [
  "CODIGO",
  "DESCRICAO",
  "CATEGORIA",
  "UNIDADE CONSUMO",
  "QUANTIDADE UNITARIA",
  "REPETICOES",
  "QUANTIDADE TOTAL",
] as const;

function linhaEhHeader(linha: unknown[]): boolean {
  const textos = linha.map((c) => texto(c).toUpperCase());
  return COLUNAS_ESPERADAS.every((col) => textos.includes(col));
}

function linhaVazia(linha: unknown[]): boolean {
  return linha.every((c) => texto(c) === "");
}

/**
 * Lê a aba "MATERIAL" de uma planilha de levantamento elétrico (mesmo
 * arquivo/template usado no Levantamento Elétrico) e devolve as linhas de
 * material já calculadas pelas fórmulas da planilha — CODIGO é usado
 * depois pra casar com o catálogo (MaterialEletrico.codigo), não o texto
 * da descrição.
 */
export function importarPlanilhaMateriais(buffer: Buffer): ResultadoImportMateriais {
  const avisos: string[] = [];
  const wb = XLSX.read(buffer, { type: "buffer" });

  const nomeAba = wb.SheetNames.find((n) => n.trim().toUpperCase() === "MATERIAL");
  if (!nomeAba) {
    return {
      linhas: [],
      avisos: [`Esta planilha não tem uma aba "MATERIAL" (abas encontradas: ${wb.SheetNames.join(", ")}).`],
    };
  }

  const ws = wb.Sheets[nomeAba];
  if (!ws) {
    return { linhas: [], avisos: [`Não consegui ler a aba "${nomeAba}" desta planilha.`] };
  }
  const grade = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  const indiceHeader = grade.findIndex((linha) => Array.isArray(linha) && linhaEhHeader(linha));
  if (indiceHeader === -1) {
    return {
      linhas: [],
      avisos: [
        `Não encontrei a linha de cabeçalho esperada na aba "MATERIAL" (procurei por: ${COLUNAS_ESPERADAS.join(", ")}).`,
      ],
    };
  }

  const header = grade[indiceHeader]!.map((c) => texto(c).toUpperCase());
  const idx = {
    codigo: header.indexOf("CODIGO"),
    descricao: header.indexOf("DESCRICAO"),
    categoria: header.indexOf("CATEGORIA"),
    unidadeConsumo: header.indexOf("UNIDADE CONSUMO"),
    quantidadeUnitaria: header.indexOf("QUANTIDADE UNITARIA"),
    repeticoes: header.indexOf("REPETICOES"),
    quantidadeTotal: header.indexOf("QUANTIDADE TOTAL"),
  };

  const linhas: MaterialPlanilhaImportado[] = [];
  for (let i = indiceHeader + 1; i < grade.length; i++) {
    const linha = grade[i];
    if (!Array.isArray(linha) || linhaVazia(linha)) break; // fim da tabela

    const codigo = texto(linha[idx.codigo]);
    const descricao = texto(linha[idx.descricao]);
    if (!codigo || !descricao) {
      avisos.push(`Linha ${i + 1} da aba MATERIAL ignorada — sem código ou descrição.`);
      continue;
    }

    linhas.push({
      codigo,
      descricao,
      categoria: texto(linha[idx.categoria]),
      unidadeConsumo: texto(linha[idx.unidadeConsumo]) || "UN",
      quantidadeUnitaria: num(linha[idx.quantidadeUnitaria]),
      repeticoes: Math.round(num(linha[idx.repeticoes])),
      quantidadeTotal: num(linha[idx.quantidadeTotal]),
    });
  }

  if (linhas.length === 0) {
    avisos.push('A aba "MATERIAL" não tem nenhuma linha de material abaixo do cabeçalho.');
  }

  return { linhas, avisos };
}
