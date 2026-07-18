import * as XLSX from "xlsx";

export interface CircuitoImportado {
  bitola: number;
  circuito: number | null;
  temVermelho: boolean;
  temPreto: boolean;
  temAzul: boolean;
  temVerde: boolean;
  temAmarelo: boolean;
  temBranco: boolean;
  temCinza?: boolean;
  identRetorno: string | null;
  ehParalelo: boolean;
  ehRetorno: boolean;
  sobraOverride?: number | null;
  horizOverride?: number | null;
}

export interface PecaImportada {
  numero: number;
  kit: "LAJE" | "VERTICAL" | "PISO";
  local: string | null;
  trecho: string;
  vertical1: number;
  laje1: number;
  horiz: number;
  laje2: number;
  vertical2: number;
  eletro: number;
  diametro: string;
  sobra: number;
  circuitos: CircuitoImportado[];
}

export interface TotaisOficiaisImportados {
  cabos: { bitola: number; cor: string; metros: number }[];
  eletrodutos: { diametro: string; metros: number }[];
}

export interface ResultadoImport {
  pecas: PecaImportada[];
  avisos: string[];
  // Presente só quando a planilha tem uma tabela consolidada própria
  // (calculada pelas fórmulas do Excel) — quando existe, é a fonte da
  // verdade pras sugestões de material, em vez de recalcular a partir
  // das peças (elimina risco de divergência de fórmula entre nós e a
  // planilha original).
  totaisOficiais?: TotaisOficiaisImportados;
}

function num(v: unknown): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const parsed = parseFloat(v.replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function texto(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function temX(v: unknown): boolean {
  const t = texto(v).toUpperCase();
  return t === "X" || t === "x";
}

function normalizarKit(v: string): "LAJE" | "VERTICAL" | "PISO" {
  const upper = v.toUpperCase();
  if (upper.includes("VERT")) return "VERTICAL";
  if (upper.includes("PISO")) return "PISO";
  return "LAJE";
}

function normalizarDiametro(v: string): string {
  return v.replace(/''/g, '"').replace(/'/g, '"').trim() || '3/4"';
}

function ehLinhaPeca(valor: string): boolean {
  const upper = valor.toUpperCase();
  return upper.includes("PEÇA") || upper.includes("PECA") || /^PE[CÇ]A\s*\d/i.test(valor);
}

/**
 * Encontra a coluna B (a que contém "PEÇA XX") dinamicamente.
 * Escaneia as primeiras 20 linhas procurando a coluna que contém
 * "PEÇA" ou "PEÇAS" como cabeçalho.
 */
function encontrarColunaPeca(linhas: unknown[][]): number {
  for (let i = 0; i < Math.min(linhas.length, 20); i++) {
    const row = linhas[i];
    if (!row) continue;
    for (let col = 0; col < Math.min(row.length, 10); col++) {
      const v = texto(row[col]).toUpperCase();
      if (v === "PEÇAS" || v === "PECAS" || v === "PEÇA" || v === "PECA") {
        return col;
      }
    }
  }
  return 1; // fallback: coluna B (índice 1)
}

/**
 * Encontra a coluna de bitola (#) procurando pelo cabeçalho.
 */
function encontrarColunaBitola(linhas: unknown[][], colPeca: number): number {
  // Procura na linha do cabeçalho (mesma linha onde está "PEÇAS")
  for (let i = 0; i < Math.min(linhas.length, 20); i++) {
    const row = linhas[i];
    if (!row) continue;
    const vPeca = texto(row[colPeca]).toUpperCase();
    if (vPeca === "PEÇAS" || vPeca === "PECAS" || vPeca === "PEÇA" || vPeca === "PECA") {
      // Encontrou a linha de cabeçalho — procura # nessa linha
      for (let col = colPeca + 1; col < row.length; col++) {
        const v = texto(row[col]);
        if (v === "#" || v === "BITOLA" || v === "Bitola") return col;
      }
    }
  }
  return colPeca + 15; // fallback: coluna Q (16, ou colPeca+15)
}

/**
 * Lê a tabela consolidada que a própria planilha já calcula (fórmulas do
 * Excel) — "TOTAL CABOS P/ APTO" e "ELETRODUTO". Quando existe, é mais
 * confiável que recalcular a partir das peças (elimina risco de
 * divergência de fórmula, e também absorve erros de checagem tipo "só
 * conta terra no de maior bitola" que nem sempre bate com o que o
 * projetista marcou de propósito na planilha).
 *
 * ISOLADA neste arquivo — não compartilha nada com o parser do formato
 * PARAMETROS (importar-planilha-parametros.ts). Mudança aqui não afeta
 * aquele formato de jeito nenhum.
 *
 * Busca célula por célula DIRETO no worksheet (não via sheet_to_json,
 * que já mostrou ser pouco confiável em pelo menos um arquivo real).
 * Detecta dinamicamente quantas colunas de cor existem (não hardcoda a
 * lista) — funciona mesmo se a planilha não tiver todas as 7 cores (essa
 * aqui, por exemplo, não tem cinza nem branco na tabela consolidada).
 */
function lerTotaisOficiaisClassico(ws: XLSX.WorkSheet): TotaisOficiaisImportados | null {
  // Calcula o alcance real a partir das PRÓPRIAS células existentes no
  // objeto, em vez de confiar no "!ref" (metadado de dimensão) da
  // planilha — arquivos .xltx (template) e alguns .xlsm mostraram esse
  // metadado não bater com o conteúdo real em mais de um caso já visto.
  let maxLinha = 0;
  let maxColuna = 0;
  for (const chave of Object.keys(ws)) {
    if (chave.startsWith("!")) continue; // chaves especiais (!ref, !margins etc.)
    const dec = XLSX.utils.decode_cell(chave);
    if (dec.r > maxLinha) maxLinha = dec.r;
    if (dec.c > maxColuna) maxColuna = dec.c;
  }
  const range = { s: { r: 0, c: 0 }, e: { r: maxLinha, c: maxColuna } };

  function valorCelula(r: number, c: number): unknown {
    const endereco = XLSX.utils.encode_cell({ r, c });
    const celula = ws[endereco];
    if (!celula) return null;
    // Célula de erro de fórmula (#VALUE!, #REF!, #N/A etc.) — o "v" bruto
    // dessas células pode vir como um código numérico interno do Excel,
    // não o texto do erro. Sem essa checagem, um erro de fórmula na
    // planilha original vira um número real (errado) do nosso lado.
    if (celula.t === "e") return null;
    return celula.v ?? null;
  }

  let linhaCab = -1;
  let colVermelho = -1;
  for (let r = range.s.r; r <= range.e.r && linhaCab === -1; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (texto(valorCelula(r, c)).toLowerCase() === "vermelho") {
        linhaCab = r;
        colVermelho = c;
        break;
      }
    }
  }

  const cabos: { bitola: number; cor: string; metros: number }[] = [];
  if (linhaCab !== -1) {
    const cores: string[] = [];
    for (let c = colVermelho; c <= range.e.c; c++) {
      const nomeCor = texto(valorCelula(linhaCab, c)).toLowerCase();
      if (!nomeCor) break;
      cores.push(nomeCor);
    }

    const colBitola = colVermelho - 1;
    for (let r = linhaCab + 1; r <= range.e.r; r++) {
      const bitola = num(valorCelula(r, colBitola));
      if (bitola <= 0) break;
      cores.forEach((cor, idx) => {
        // num() já retorna 0 pra valores não numéricos (tipo "#VALUE!",
        // erro de fórmula que às vezes aparece na planilha original) —
        // não precisa de tratamento especial aqui.
        const metros = num(valorCelula(r, colVermelho + idx));
        if (metros > 0) cabos.push({ bitola, cor, metros });
      });
    }
  }

  let linhaEletro = -1;
  let colEletro = -1;
  for (let r = range.s.r; r <= range.e.r && linhaEletro === -1; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (texto(valorCelula(r, c)).toUpperCase() === "ELETRODUTO") {
        linhaEletro = r;
        colEletro = c;
        break;
      }
    }
  }

  const eletrodutos: { diametro: string; metros: number }[] = [];
  if (linhaEletro !== -1) {
    for (let r = linhaEletro + 2; r <= range.e.r; r++) {
      const diametro = texto(valorCelula(r, colEletro));
      if (!diametro) break;
      const metros = num(valorCelula(r, colEletro + 1));
      if (metros > 0) eletrodutos.push({ diametro: normalizarDiametro(diametro), metros });
    }
  }

  if (cabos.length === 0 && eletrodutos.length === 0) return null;
  return { cabos, eletrodutos };
}

export function importarPlanilhaLevantamento(buffer: Buffer): ResultadoImport {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const avisos: string[] = [];

  const nomeAba = wb.SheetNames[0];
  if (!nomeAba) {
    return { pecas: [], avisos: ["Planilha vazia."] };
  }
  const ws = wb.Sheets[nomeAba];
  if (!ws) {
    return { pecas: [], avisos: ["Nao foi possivel ler a aba."] };
  }
  const wsNaoNulo: XLSX.WorkSheet = ws;

  avisos.push(`Aba lida: "${nomeAba}"`);

  // Tenta ler a tabela consolidada oficial ANTES de processar peça por
  // peça — se existir, ela vira a fonte da verdade nas sugestões de
  // material (mais confiável que recalcular, e evita a regra de terra
  // "só no de maior bitola" nem sempre bater com o que foi marcado
  // manualmente na planilha).
  const totaisOficiais = lerTotaisOficiaisClassico(wsNaoNulo) ?? undefined;
  if (totaisOficiais) {
    avisos.push("Totais consolidados encontrados na planilha — usando eles como referência oficial de material.");
  }

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  avisos.push(`Total de linhas na planilha: ${linhas.length}`);

  // Encontra colunas dinamicamente
  const colPeca = encontrarColunaPeca(linhas);
  const colBitola = encontrarColunaBitola(linhas, colPeca);

  // Offsets relativos a colPeca (B=1):
  // C(+1)=KIT, D(+2)=QT, E(+3)=LOCAL, F(+4)=TRECHO
  // G(+5)=VERT1, H(+6)=LAJE1, I(+7)=HORIZ, J(+8)=LAJE2, K(+9)=VERT2
  // L(+10)=ELETRO, N(+12)=DIAM, O(+13)=SOBRA
  // Fios: bitola+1=VERM, +2=PRETO, +3=AZUL, +4=VERDE, +5=AMAR, +6=BRANCO, +7=IDENT
  // Y = colBitola+8 (nº circuito)

  const pecas: PecaImportada[] = [];
  let pecaAtual: PecaImportada | null = null;
  let numeroAuto = 0;

  // Encontra onde começam os dados (linha após o cabeçalho)
  let linhaInicio = 0;
  for (let i = 0; i < Math.min(linhas.length, 20); i++) {
    const row = linhas[i];
    if (!row) continue;
    const v = texto(row[colPeca]).toUpperCase();
    if (v === "PEÇAS" || v === "PECAS" || v === "PEÇA" || v === "PECA") {
      linhaInicio = i + 1;
      break;
    }
  }

  // Se não encontrou cabeçalho, tenta a partir da linha 10
  if (linhaInicio === 0) {
    linhaInicio = 10;
    avisos.push("Cabeçalho 'PEÇAS' nao encontrado — tentando a partir da linha 11.");
  }

  let pecasEncontradas = 0;

  for (let i = linhaInicio; i < linhas.length; i++) {
    const row = linhas[i];
    if (!row) continue;

    const valPeca = texto(row[colPeca]);
    const bitola = num(row[colBitola]);

    if (ehLinhaPeca(valPeca)) {
      if (pecaAtual) pecas.push(pecaAtual);
      pecasEncontradas++;

      numeroAuto++;
      const match = valPeca.match(/(\d+)/);
      const numero = match?.[1] ? parseInt(match[1], 10) : numeroAuto;

      pecaAtual = {
        numero,
        kit: normalizarKit(texto(row[colPeca + 1])),
        local: texto(row[colPeca + 3]) || null,
        trecho: texto(row[colPeca + 4]) || `L${numero}`,
        vertical1: num(row[colPeca + 5]),
        laje1: num(row[colPeca + 6]),
        horiz: num(row[colPeca + 7]),
        laje2: num(row[colPeca + 8]),
        vertical2: num(row[colPeca + 9]),
        eletro: num(row[colPeca + 10]),
        diametro: normalizarDiametro(texto(row[colPeca + 12])),
        sobra: num(row[colPeca + 13]) || 0.3,
        circuitos: [],
      };
    }

    // Linha de circuito — precisa ter bitola > 0
    if (pecaAtual && bitola > 0) {
      const temAmarelo = temX(row[colBitola + 5]);
      const temBranco = temX(row[colBitola + 6]);
      const temFases =
        temX(row[colBitola + 1]) ||
        temX(row[colBitola + 2]) ||
        temX(row[colBitola + 3]);

      pecaAtual.circuitos.push({
        bitola,
        circuito:
          row[colBitola + 8] !== null && row[colBitola + 8] !== undefined
            ? num(row[colBitola + 8])
            : null,
        temVermelho: temX(row[colBitola + 1]),
        temPreto: temX(row[colBitola + 2]),
        temAzul: temX(row[colBitola + 3]),
        temVerde: temX(row[colBitola + 4]),
        temAmarelo,
        temBranco,
        identRetorno: texto(row[colBitola + 7]) || null,
        ehParalelo: temAmarelo && !temFases,
        ehRetorno: temBranco && !temFases && !temAmarelo,
      });
    }
  }

  if (pecaAtual) pecas.push(pecaAtual);

  avisos.push(`Linhas com "PEÇA" encontradas: ${pecasEncontradas}`);

  // Filtra peças vazias do template
  const pecasValidas = pecas.filter(
    (p) =>
      p.circuitos.length > 0 ||
      p.eletro > 0 ||
      p.horiz > 0 ||
      (p.trecho && !/^(L\d+|PEÇA|PECA)/i.test(p.trecho))
  );

  const descartadas = pecas.length - pecasValidas.length;
  if (descartadas > 0) {
    avisos.push(`${descartadas} linha(s) de template vazia(s) ignorada(s).`);
  }

  if (pecasValidas.length === 0 && pecasEncontradas === 0) {
    // Mostra as primeiras linhas para ajudar a debugar
    const amostra: string[] = [];
    for (let i = 0; i < Math.min(linhas.length, 15); i++) {
      const row = linhas[i];
      if (!row) continue;
      const vals = row
        .slice(0, 10)
        .map((v, idx) => (v !== null ? `${idx}=${v}` : null))
        .filter(Boolean);
      if (vals.length > 0) amostra.push(`L${i}: ${vals.join(" | ")}`);
    }
    avisos.push(`Debug — primeiras linhas: ${amostra.join(" / ")}`);
  }

  return { pecas: pecasValidas, avisos, totaisOficiais };
}
