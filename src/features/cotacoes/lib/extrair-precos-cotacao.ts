"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

export interface ItemCotacaoExtraido {
  descricao: string;
  valorUnitario: number;
  /** Código/SKU do fornecedor, quando identificável — útil pra matching futuro. */
  codigo?: string;
}

const RUIDO_RODAPE =
  /^(total|subtotal|soma|desconto|frete|icms|ipi|página|validade|condi[cç][aã]o|pedido\s*m[ií]nimo|peso\s*estimado|disponibilidade|valor\s*total)/i;

/**
 * Converte um número no formato brasileiro ("1.234,56") para float.
 */
function paraNumero(bruto: string): number {
  return Number(bruto.replace(/\./g, "").replace(",", "."));
}

/**
 * Extrai o texto de um PDF preservando a posição visual das colunas
 * (`pdftotext -layout`, via poppler-utils instalado na imagem Docker).
 *
 * Por que não usar `pdf-parse` (JS puro): ele lineariza o conteúdo do PDF
 * na ordem em que os objetos de texto aparecem no arquivo, que raramente
 * bate com a ordem visual de uma tabela — numa tabela com colunas Item /
 * Código / Qtd / Descrição / Preço, o texto extraído agrupa TODAS as
 * células de uma coluna antes de passar pra próxima (ex: todos os
 * "Item", depois todos os "Código", etc.), tornando impossível casar
 * descrição com preço de forma confiável. `pdftotext -layout` reconstrói
 * a posição visual e cada linha da tabela sai alinhada corretamente.
 *
 * Por que arquivo temporário em vez de stdin: a versão assíncrona de
 * `execFile` (a única viável num Server Action, que não pode bloquear)
 * não aceita a opção `input` pra escrever no stdin do processo — isso só
 * existe em `execFileSync`/`spawnSync`. Gravar num arquivo temporário e
 * passar o caminho como argumento evita esse problema e ainda funciona
 * com o segundo "-" (saída pro stdout, sem gerar arquivo .txt no disco).
 */
async function extrairTextoComLayout(buffer: Buffer): Promise<string> {
  const caminhoTemp = join(tmpdir(), `cotacao-${randomUUID()}.pdf`);
  await writeFile(caminhoTemp, buffer);
  try {
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-layout", caminhoTemp, "-"],
      { maxBuffer: 1024 * 1024 * 20, encoding: "utf8" }
    );
    return stdout;
  } finally {
    await unlink(caminhoTemp).catch(() => {});
  }
}


// ---------------------------------------------------------------------------
// Padrões de linha — tentados nessa ordem. Novos formatos de fornecedor
// devem ser adicionados aqui como um padrão novo, sem remover os
// anteriores (cada fornecedor usa um layout de PDF diferente).
// ---------------------------------------------------------------------------

/**
 * Padrão A — tabela com código de produto como âncora:
 * "  2   CX44DW    1   Caixa 4x4 - DW (Com tampa) para Alvenaria   R$ 2,52   0%   R$ 2,52"
 * item, código, qtd, descrição (pode vir vazia — ver observação no
 * arquivo de diagnóstico: alguns PDFs não têm a descrição extraível como
 * texto pra itens com especificação em 2 linhas), preço final, IPI, total.
 * O código é o campo mais confiável — sempre presente e sem espaços.
 */
const PADRAO_COM_CODIGO =
  /^\s*(\d{1,4})\s+(\S{2,24})\s+(\d+(?:[.,]\d+)?)\s+(.*?)\s*R\$\s*([\d.,]+)\s+\d+\s*%\s+R\$\s*([\d.,]+)\s*$/;

/**
 * Padrão B (fallback) — sem código de produto identificável, só
 * "descrição ... R$ preço" ao final da linha. Mais permissivo, então só
 * é tentado quando o Padrão A não bate — layouts mais simples de outros
 * fornecedores.
 */
const PADRAO_SIMPLES =
  /^(.{5,80}?)\s+(?:R\$\s?)?([\d.]+,\d{2,4})(?:\s+(?:R\$\s?)?([\d.]+,\d{2,4}))?$/;

export async function extrairPrecosCotacao(
  base64: string
): Promise<{ itens: ItemCotacaoExtraido[]; textoCompleto: string } | { erro: string }> {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { erro: "Não consegui ler o arquivo enviado." };
  }

  let texto: string;
  try {
    texto = await extrairTextoComLayout(buffer);
  } catch (e) {
    console.error("[extrairPrecosCotacao] erro ao rodar pdftotext:", e);
    return {
      erro:
        "Não consegui extrair texto desse PDF — confirma que é um PDF válido (não escaneado como imagem).",
    };
  }

  const linhas = texto.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);

  const itens: ItemCotacaoExtraido[] = [];

  for (const linha of linhas) {
    const linhaLimpa = linha.trim();
    if (RUIDO_RODAPE.test(linhaLimpa)) continue;

    // Tenta primeiro o padrão com código (mais confiável quando existe).
    const comCodigo = linha.match(PADRAO_COM_CODIGO);
    if (comCodigo) {
      const codigo = comCodigo[2];
      const descricaoBruta = comCodigo[4];
      const preco = comCodigo[5];
      if (!codigo || !preco) continue;

      const descricao = (descricaoBruta ?? "").trim();
      const valorUnitario = paraNumero(preco);
      if (!valorUnitario || valorUnitario <= 0) continue;

      itens.push({
        // Quando o PDF não tem a descrição extraível como texto (comum
        // em itens com especificação técnica de 2 linhas — ver diagnóstico),
        // usa o código como identificador visível na tela de revisão, em
        // vez de deixar a linha em branco.
        descricao: descricao || `[${codigo}] — descrição não disponível no PDF do fornecedor`,
        valorUnitario,
        codigo,
      });
      continue;
    }

    // Fallback: layout mais simples, sem código de produto identificável.
    const simples = linhaLimpa.match(PADRAO_SIMPLES);
    if (simples) {
      const [, descricaoBruta, primeiroValor] = simples;
      if (!descricaoBruta || !primeiroValor) continue;
      const descricao = descricaoBruta.trim();
      if (RUIDO_RODAPE.test(descricao) || descricao.length < 5) continue;

      const valorUnitario = paraNumero(primeiroValor);
      if (!valorUnitario || valorUnitario <= 0) continue;

      itens.push({ descricao, valorUnitario });
    }
  }

  return { itens, textoCompleto: texto };
}
