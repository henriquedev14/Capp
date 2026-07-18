import * as XLSX from "xlsx";

export interface LinhaTabelaPreco {
  codigoInterno: string;
  descricao: string;
  unidade: string;
  valorUnitario: number;
  marca: string;
  prazoEntrega: string;
  observacoes: string;
}

export interface ResultadoImportTabelaPreco {
  linhas: LinhaTabelaPreco[];
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

// Nomes de coluna esperados na planilha padrão. "OBSERVACOES" não entra
// aqui de propósito — é opcional, não pode ser exigida pra reconhecer o
// cabeçalho (senão uma planilha sem observações nunca acharia o header).
const COLUNAS_OBRIGATORIAS = ["CODIGO INTERNO", "DESCRICAO", "UNIDADE", "VALOR UNITARIO", "MARCA", "PRAZO DE ENTREGA"] as const;

function texturizarHeader(v: unknown): string {
  return texto(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function linhaEhHeader(linha: unknown[]): boolean {
  const textos = linha.map(texturizarHeader);
  return COLUNAS_OBRIGATORIAS.every((col) => textos.includes(col));
}

function linhaVazia(linha: unknown[]): boolean {
  return linha.every((c) => texto(c) === "");
}

/**
 * Lê a planilha padrão de tabela de preços (.xlsx) — a mesma planilha que
 * a empresa monta manualmente a partir do que cada fornecedor manda em
 * formatos diferentes. CODIGO INTERNO é usado depois pra casar com
 * MaterialEletrico.codigo — nunca por texto de descrição.
 */
export function importarTabelaPrecoPadrao(buffer: Buffer): ResultadoImportTabelaPreco {
  const avisos: string[] = [];
  const wb = XLSX.read(buffer, { type: "buffer" });

  const nomeAba = wb.SheetNames[0];
  if (!nomeAba) {
    return { linhas: [], avisos: ["Esta planilha não tem nenhuma aba."] };
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
        `Não encontrei a linha de cabeçalho esperada (procurei por: ${COLUNAS_OBRIGATORIAS.join(", ")}). Confirme que está usando a planilha padrão da empresa.`,
      ],
    };
  }

  const header = grade[indiceHeader]!.map(texturizarHeader);
  const idx = {
    codigo: header.indexOf("CODIGO INTERNO"),
    descricao: header.indexOf("DESCRICAO"),
    unidade: header.indexOf("UNIDADE"),
    valorUnitario: header.indexOf("VALOR UNITARIO"),
    marca: header.indexOf("MARCA"),
    prazoEntrega: header.indexOf("PRAZO DE ENTREGA"),
    observacoes: header.indexOf("OBSERVACOES"),
  };

  const linhas: LinhaTabelaPreco[] = [];
  for (let i = indiceHeader + 1; i < grade.length; i++) {
    const linha = grade[i];
    if (!Array.isArray(linha) || linhaVazia(linha)) break; // fim da tabela

    const codigoInterno = texto(linha[idx.codigo]);
    const descricao = texto(linha[idx.descricao]);
    if (!codigoInterno || !descricao) {
      avisos.push(`Linha ${i + 1} ignorada — sem código interno ou descrição.`);
      continue;
    }

    linhas.push({
      codigoInterno,
      descricao,
      unidade: texto(linha[idx.unidade]) || "UN",
      valorUnitario: num(linha[idx.valorUnitario]),
      marca: texto(linha[idx.marca]) || "Não informado",
      prazoEntrega: texto(linha[idx.prazoEntrega]),
      observacoes: idx.observacoes >= 0 ? texto(linha[idx.observacoes]) : "",
    });
  }

  if (linhas.length === 0) {
    avisos.push("Não encontrei nenhuma linha de material abaixo do cabeçalho.");
  }

  return { linhas, avisos };
}
