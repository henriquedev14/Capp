"use server";

// @ts-expect-error — pdf-parse não tem types oficiais completos
import pdfParse from "pdf-parse";

export interface ItemNotaExtraido {
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
}

/**
 * Extrai texto de um PDF de DANFE e tenta identificar a tabela de itens
 * usando padrões de texto (sem IA, sem API externa — conforme decidido).
 *
 * IMPORTANTE: layout de DANFE varia MUITO entre fornecedores/softwares
 * fiscais diferentes. Isso é uma tentativa de melhor esforço — o
 * resultado SEMPRE precisa ser conferido por uma pessoa antes de virar
 * entrada de estoque de verdade (por isso a tela de revisão existe,
 * nunca aplica direto sem confirmação).
 *
 * Heurística: procura linhas terminando em 3 números no formato
 * brasileiro (quantidade, valor unitário, valor total) — típico da
 * linha de item de uma tabela de DANFE quando o texto é extraído sem
 * preservar as colunas visuais.
 */
export async function extrairItensDaNota(
  base64: string
): Promise<{ itens: ItemNotaExtraido[]; textoCompleto: string } | { erro: string }> {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { erro: "Não consegui ler o arquivo enviado." };
  }

  let texto: string;
  try {
    const resultado = await pdfParse(buffer);
    texto = resultado.text;
  } catch (e) {
    return { erro: "Não consegui extrair texto desse PDF — confirma que é um DANFE válido." };
  }

  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);

  // Padrão: descrição, seguida de unidade (UN/M/PC/KG etc, opcional) e 3
  // números no formato brasileiro (quantidade, valor unit., valor total).
  const PADRAO_ITEM =
    /^(.{5,60}?)\s+(UN|M|PC|KG|CX|MT|UND)?\s*([\d.]+,\d{2,4})\s+([\d.]+,\d{2,4})\s+([\d.]+,\d{2,4})$/i;

  const itens: ItemNotaExtraido[] = [];
  for (const linha of linhas) {
    const m = linha.match(PADRAO_ITEM);
    if (!m) continue;
    const [, descricaoBruta, unidade, qtd] = m;
    if (!descricaoBruta || !qtd) continue;
    const descricao = descricaoBruta.trim();
    // Filtra linhas óbvias de totais/rodapé que passariam no regex por
    // coincidência (ex: "VALOR TOTAL DA NOTA... 1.234,56").
    if (/total|desconto|frete|icms|ipi/i.test(descricao)) continue;

    const quantidade = Number(qtd.replace(/\./g, "").replace(",", "."));
    if (!quantidade || quantidade <= 0) continue;

    itens.push({
      descricao,
      quantidade,
      unidade: (unidade ?? "UN").toUpperCase(),
      valorUnitario: 0, // não usado pra entrada de estoque, só decorativo se precisar no futuro
    });
  }

  return { itens, textoCompleto: texto };
}
