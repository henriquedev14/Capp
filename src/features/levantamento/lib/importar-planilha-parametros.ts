import * as XLSX from "xlsx";
import type { PecaImportada, CircuitoImportado, ResultadoImport, TotaisOficiaisImportados } from "./importar-planilha";

// ============================================================================
// Parser do formato "PARAMETROS" — v3, lendo direto da aba BASE.
//
// HISTÓRICO DA CORREÇÃO (2 rodadas de bug real encontrado via validação
// contra planilha de verdade):
//
// v1 (descartada): tentava recalcular tudo a partir de PARAMETROS +
// CIRCUITOS_QDC (distância vertical por tipo de ponto, cor do fio via
// lookup de circuito). Números batiam só coincidentemente — a cor do fio
// é decisão MANUAL do projetista (texto "X" literal na planilha), não
// algo derivável de CIRCUITOS_QDC.
//
// v2 (quase certa): passou a ler direto da aba BASE (fonte confiável,
// já revisada), agrupando sub-linhas por "PEÇA NN" e usando a distância
// do cabeçalho do grupo pra todas as sub-linhas. Validação pegou 14/15
// categorias exatas — só "amarelo" divergia (98,8 vs 100,3 esperado).
//
// v3 (esta): a causa da última divergência é que sub-linhas dentro do
// MESMO grupo "PEÇA" podem ter distância PRÓPRIA diferente entre si —
// não é sempre a mesma distância do cabeçalho repetida (ex: um fio de
// retorno pode percorrer um caminho ligeiramente diferente do trecho
// principal). Agora cada sub-linha lê sua PRÓPRIA distância (coluna J
// daquela linha específica), em vez de herdar do cabeçalho do grupo.
// Validado: 15/15 categorias batendo exatamente com os totais reais.
// ============================================================================

interface SubLinha {
  bitola: number;
  distancia: number; // distância PRÓPRIA desta sub-linha — não herda do grupo
  cores: {
    vermelho: boolean;
    preto: boolean;
    cinza: boolean;
    azul: boolean;
    verde: boolean;
    amarelo: boolean; // paralelo (retorno de múltiplos interruptores)
    branco: boolean; // retorno simples
  };
}

interface GrupoPeca {
  numero: number;
  kit: string | null; // ex: "PAR 01 (PEÇA A)" — rótulo livre do projetista
  trecho: string;
  diametro: string;
  sobra: number;
  eletro: number; // coluna G ("ELETRO") — comprimento físico do eletroduto, só na 1ª linha do grupo
  subLinhas: SubLinha[];
}

export function ehFormatoParametros(wb: XLSX.WorkBook): boolean {
  const nomes = wb.SheetNames.map((n) => n.toUpperCase());
  // "DISPOSITIVOS" não é confiável — algumas planilhas reais (ex:
  // Mediterrane) não têm essa aba, têm GLOBAL/PONTOS/TRECHOS/MATERIAL no
  // lugar. O que realmente importa é ter PARAMETROS + CIRCUITOS_QDC (o
  // "assinatura" desse formato) E a aba BASE, que é a que de fato lemos.
  return nomes.includes("PARAMETROS") && nomes.includes("CIRCUITOS_QDC") && nomes.includes("BASE");
}

function texto(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function num(v: unknown): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const p = parseFloat(v.replace(",", "."));
    return isNaN(p) ? 0 : p;
  }
  return 0;
}

// Normaliza texto de diâmetro/polegada — a planilha às vezes grava aspas
// duplas retas ("), às vezes duas aspas simples (''), representando a
// mesma coisa visualmente (3/4"). Sem isso, viram categorias "diferentes"
// só por causa do caractere usado. Também cobre erro de digitação real
// (ex: alguém digitou "25" em vez de 3/4" numa planilha real) — sem o
// caractere de polegada ("), não é um diâmetro válido reconhecível, então
// cai no padrão em vez de virar uma categoria fantasma isolada.
function normalizarDiametro(v: string): string {
  const limpo = v.replace(/''/g, '"').trim();
  return limpo.includes('"') ? limpo : '3/4"';
}

// Uma célula "marcada" pode ser texto "X", um valor calculado por fórmula
// (cinza/amarelo), ou qualquer outra coisa não-vazia — o critério real da
// planilha é simplesmente "não está em branco".
function marcado(v: unknown): boolean {
  return texto(v) !== "";
}

/**
 * Lê a tabela consolidada que a própria planilha já calcula (fórmulas do
 * Excel) — "TOTAL CABOS P/ APTO" (bitola × cor) e "ELETRODUTO" (BIT ×
 * QTDE). Quando existe, é mais confiável que recalcular a partir das
 * peças (elimina risco de divergência de fórmula). Busca pelos RÓTULOS
 * ("vermelho", "ELETRODUTO"), não por posição fixa — a posição pode
 * variar entre plantas/apartamentos diferentes.
 */
/**
 * Lê a tabela consolidada que a própria planilha já calcula (fórmulas do
 * Excel) — "TOTAL CABOS P/ APTO" (bitola × cor) e "ELETRODUTO" (BIT ×
 * QTDE). Quando existe, é mais confiável que recalcular a partir das
 * peças (elimina risco de divergência de fórmula). Busca célula por
 * célula DIRETO no worksheet (não usa sheet_to_json aqui) — mais
 * confiável que depender de um array já convertido, e funciona mesmo se
 * a posição variar bastante entre plantas diferentes.
 *
 * Também detecta automaticamente quantas colunas de cor existem — se um
 * dia for adicionada uma fase nova (8ª cor), não precisa mexer no código:
 * o cabeçalho da tabela de cabos é lido dinamicamente, olhando quantas
 * colunas consecutivas depois de "vermelho" têm texto (nome de cor).
 */
function lerTotaisOficiais(ws: XLSX.WorkSheet): TotaisOficiaisImportados | null {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1:A1");

  function valorCelula(r: number, c: number): unknown {
    const endereco = XLSX.utils.encode_cell({ r, c });
    return ws[endereco]?.v ?? null;
  }

  // Acha a célula com "vermelho" — cabeçalho da tabela de cabos. A célula
  // imediatamente à esquerda dela é o cabeçalho da coluna de bitola
  // (geralmente "X", mas o texto exato não importa).
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
    // Detecta dinamicamente quantas colunas de cor existem: lê célula por
    // célula a partir de "vermelho" enquanto houver texto não-vazio no
    // cabeçalho — cobre o caso de uma cor nova ser adicionada (8ª fase),
    // sem precisar hardcodar a lista de cores.
    const cores: string[] = [];
    for (let c = colVermelho; c <= range.e.c; c++) {
      const nomeCor = texto(valorCelula(linhaCab, c)).toLowerCase();
      if (!nomeCor) break;
      cores.push(nomeCor);
    }

    const colBitola = colVermelho - 1;
    for (let r = linhaCab + 1; r <= range.e.r; r++) {
      const bitola = num(valorCelula(r, colBitola));
      if (bitola <= 0) break; // acabou a tabela
      cores.forEach((cor, idx) => {
        const metros = num(valorCelula(r, colVermelho + idx));
        if (metros > 0) cabos.push({ bitola, cor, metros });
      });
    }
  }

  // Acha "ELETRODUTO" — cabeçalho da segunda tabela, logo abaixo tem
  // "BIT" / "QTDE".
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
    // Pula a linha "ELETRODUTO" e a linha "BIT/QTDE", começa nos dados
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

export function importarPlanilhaParametros(buffer: Buffer): ResultadoImport {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const avisos: string[] = ['Formato detectado: planilha "PARAMETROS" (lendo relatório final da aba BASE).'];

  const nomeBase = wb.SheetNames.find((n) => n.toUpperCase() === "BASE");
  if (!nomeBase) {
    return { pecas: [], avisos: ["Aba BASE não encontrada — não dá pra ler o relatório final."] };
  }
  const ws = wb.Sheets[nomeBase];
  if (!ws) {
    return { pecas: [], avisos: ["Aba BASE vazia."] };
  }
  // Referência não-nula explícita — o TypeScript não propaga o
  // "if (!ws) return" acima pra dentro de funções aninhadas definidas
  // logo abaixo, então perde o estreitamento de tipo sem isso.
  const wsNaoNulo: XLSX.WorkSheet = ws;

  // Leitura célula-a-célula DIRETO no worksheet (não usa sheet_to_json
  // aqui) — em pelo menos um arquivo real, sheet_to_json não retornava
  // células que existiam de verdade na planilha (provavelmente por causa
  // de como esse arquivo .xlsm específico foi salvo). Acesso direto via
  // endereço de célula é a forma mais confiável de ler, sem depender de
  // conversões intermediárias.
  const range = XLSX.utils.decode_range(wsNaoNulo["!ref"] ?? "A1:A1");
  function valorCelula(r: number, c: number): unknown {
    const endereco = XLSX.utils.encode_cell({ r, c });
    return wsNaoNulo[endereco]?.v ?? null;
  }

  // Tenta ler a tabela consolidada oficial ANTES de processar peça por
  // peça — se existir, ela vira a fonte da verdade nas sugestões de
  // material (mais confiável que recalcular).
  const totaisOficiais = lerTotaisOficiais(ws) ?? undefined;
  if (totaisOficiais) {
    avisos.push("Totais consolidados encontrados na planilha — usando eles como referência oficial de material.");
  }

  // Acha a linha de cabeçalho ("PEÇAS" na coluna B, mas a coluna exata
  // pode variar) — comparação BEM tolerante: alguns arquivos .xlsm trazem
  // esse caractere especial (Ç) corrompido de formas imprevisíveis (não
  // só acento, às vezes mojibake de verdade). Em vez de comparar o texto,
  // procura um padrão "PE" + até 3 caracteres quaisquer + "AS" — cobre
  // "PEÇAS", "PECAS", "PEAS" (Ç sumindo) e variações de mojibake no meio.
  //
  // IMPORTANTE: a palavra "Peças" também aparece sozinha no topo da
  // planilha (rótulo de impressão, tipo "Revisão: 1 / Peças / Metros"),
  // sem ser o cabeçalho da tabela de verdade. Pra não confundir os dois,
  // exige que a célula logo à direita seja "KIT" — só a tabela de
  // verdade tem essa sequência PEÇAS→KIT lado a lado.
  let linhaCabecalho = -1;
  let colPeca = -1;
  for (let r = range.s.r; r <= range.e.r && linhaCabecalho === -1; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const celula = texto(valorCelula(r, c)).toUpperCase();
      if (/^PE.{0,3}AS$/.test(celula) && texto(valorCelula(r, c + 1)).toUpperCase() === "KIT") {
        linhaCabecalho = r;
        colPeca = c;
        break;
      }
    }
  }
  if (linhaCabecalho === -1) {
    return { pecas: [], avisos: ['Não encontrei o cabeçalho "PEÇAS" na aba BASE.'] };
  }

  // Colunas relativas à coluna "PEÇAS" (colPeca) — o layout sempre segue
  // essa ordem a partir dela, mesmo que a posição absoluta varie entre
  // arquivos: PEÇAS, KIT, QT, CIRCUITOS, TRECHO, ELETRO, ∅, SOBRA,
  // TOTAL/CABOS, BITOLA, VERMELHO, PRETO, CINZA, AZUL, VERDE, AMARELO,
  // BRANCO.
  const colKit = colPeca + 1;
  const colTrecho = colPeca + 4;
  const colEletro = colPeca + 5;
  const colDiametro = colPeca + 6;
  const colSobra = colPeca + 7;
  const colTotalCabos = colPeca + 8;
  const colBitola = colPeca + 9;
  const colVermelho = colPeca + 10;
  const colPreto = colPeca + 11;
  const colCinza = colPeca + 12;
  const colAzul = colPeca + 13;
  const colVerde = colPeca + 14;
  const colAmarelo = colPeca + 15;
  const colBranco = colPeca + 16;

  const grupos: GrupoPeca[] = [];
  let atual: GrupoPeca | null = null;

  for (let r = linhaCabecalho + 1; r <= range.e.r; r++) {
    const pecaLabel = texto(valorCelula(r, colPeca));
    const bitolaRaw = valorCelula(r, colBitola);

    if (/^PE.{0,3}\s?\d/.test(pecaLabel.toUpperCase())) {
      if (atual) grupos.push(atual);
      const match = pecaLabel.match(/(\d+)/);
      atual = {
        numero: match?.[1] ? parseInt(match[1], 10) : grupos.length + 1,
        kit: texto(valorCelula(r, colKit)) || null,
        trecho: texto(valorCelula(r, colTrecho)),
        diametro: normalizarDiametro(texto(valorCelula(r, colDiametro))),
        sobra: num(valorCelula(r, colSobra)) || 0.3,
        // ELETRO só vem preenchido nesta primeira linha do grupo — as
        // demais linhas do mesmo trecho físico deixam em branco de
        // propósito (é o MESMO eletroduto, não conta de novo).
        eletro: num(valorCelula(r, colEletro)),
        subLinhas: [],
      };
    }

    if (!atual) continue; // linhas antes do primeiro "PEÇA" — ignora

    if (bitolaRaw !== null && bitolaRaw !== undefined && texto(bitolaRaw) !== "") {
      atual.subLinhas.push({
        bitola: num(bitolaRaw),
        // IMPORTANTE: distância PRÓPRIA desta linha (coluna TOTAL/CABOS
        // desta linha específica), não herdada do cabeçalho do grupo.
        distancia: num(valorCelula(r, colTotalCabos)),
        cores: {
          vermelho: marcado(valorCelula(r, colVermelho)),
          preto: marcado(valorCelula(r, colPreto)),
          cinza: marcado(valorCelula(r, colCinza)),
          azul: marcado(valorCelula(r, colAzul)),
          verde: marcado(valorCelula(r, colVerde)),
          amarelo: marcado(valorCelula(r, colAmarelo)),
          branco: marcado(valorCelula(r, colBranco)),
        },
      });
    }
  }
  if (atual) grupos.push(atual);

  if (grupos.length === 0) {
    return { pecas: [], avisos: ["Nenhuma peça encontrada — verifique o formato do arquivo."] };
  }

  const totalSubLinhas = grupos.reduce((s, g) => s + g.subLinhas.length, 0);
  avisos.push(`${grupos.length} peça(s) / ${totalSubLinhas} linha(s) de fio lida(s) da aba BASE.`);

  // Cada GRUPO vira UMA peça (trecho físico real — importante pro
  // eletroduto não ser contado mais de uma vez). Cada sub-linha dentro do
  // grupo vira um CIRCUITO daquela peça, carregando sua distância PRÓPRIA
  // via horizOverride (não afeta o cálculo de eletroduto, que sempre usa
  // o horiz da peça — só afeta o cálculo de cabo, que é por circuito).
  //
  // Nota: não criamos mais "peças virtuais" artificiais pra simular terra
  // no paralelo — isso poluía a lista de peças que o usuário vê na tela
  // (apareciam trechos falsos tipo "(terra do paralelo)" que não existem
  // na planilha de verdade). Agora que a tabela oficial da planilha
  // (totaisOficiais) é a fonte usada nas sugestões de material e na tela
  // de totais, não precisa mais dessa gambiarra — as peças aqui refletem
  // exatamente o que está na planilha, sem invenção.
  const pecas: PecaImportada[] = [];
  for (const g of grupos) {
    if (g.subLinhas.length === 0) continue;
    const primeira = g.subLinhas[0];
    if (!primeira) continue;

    const circuitos: CircuitoImportado[] = g.subLinhas.map((sub) => ({
      bitola: sub.bitola,
      circuito: null, // não rastreamos nº de circuito nesta leitura — só cor/bitola física, que é o que importa pra material
      temVermelho: sub.cores.vermelho,
      temPreto: sub.cores.preto,
      temAzul: sub.cores.azul,
      temVerde: sub.cores.verde,
      temAmarelo: sub.cores.amarelo,
      temBranco: sub.cores.branco,
      temCinza: sub.cores.cinza,
      identRetorno: null,
      ehParalelo: sub.cores.amarelo,
      ehRetorno: sub.cores.amarelo || sub.cores.branco,
      // Distância própria desta linha de fio — permite que fios diferentes
      // no MESMO trecho físico tenham comprimentos ligeiramente distintos,
      // sem duplicar a contagem do eletroduto (peça é única por trecho).
      horizOverride: sub.distancia,
    }));

    pecas.push({
      numero: g.numero,
      kit: g.kit && g.kit.toUpperCase().includes("PAR") ? "VERTICAL" : "LAJE",
      local: null,
      trecho: g.trecho,
      // Comprimento da PEÇA (eletroduto) — vem da coluna ELETRO,
      // preenchida só na primeira linha do grupo. NUNCA da coluna
      // TOTAL/CABOS, que é uma conta diferente (inclui sobra, é por
      // linha de fio, não por trecho físico).
      vertical1: 0,
      laje1: 0,
      horiz: g.eletro,
      laje2: 0,
      vertical2: 0,
      eletro: g.eletro,
      diametro: g.diametro,
      sobra: g.sobra,
      circuitos,
    });
  }

  return { pecas, avisos, totaisOficiais };
}
