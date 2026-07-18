import { prisma } from "@/infra/db/prisma/client";

/**
 * Catálogo oficial de materiais Elétrico — códigos internos HGI, esquema
 * CCEEVV (categoria / bitola-ou-medida / cor-ou-variante). Substitui o seed
 * antigo (baseado na planilha QDC_PACAEMBU), que não tinha código.
 *
 * Legenda do código:
 *   CC = 10 Caixas | 11 Acessórios | 20 Eletrodutos | 21 Conexões/Luvas |
 *        30 Cabos | 40 Conectores Wago
 *   EE (cabos) = 15/25/40/60/10 → bitola em mm² (1,5 / 2,5 / 4 / 6 / 10)
 *   EE (eletrodutos) = 25/32/40 → diâmetro em mm
 *   VV (cores) = 01 Vermelho, 02 Preto, 03 Cinza, 04 Azul, 05 Verde,
 *                06 Branco, 07 Amarelo
 *
 * Observações da consolidação (15/07/2026):
 *   - A lista original tinha o código 105158 duplicado (uma vez com "X",
 *     outra com "×") e um item de "20x20x12" repetido sob 2 códigos
 *     diferentes (105212 e 106212). Mantido só o primeiro código de cada.
 *   - "×" (sinal de multiplicação) normalizado pra "X" (letra) em todas as
 *     descrições de caixa de passagem, por consistência.
 *   - Sem fabricante por item na planilha original — "Wago" pros conectores
 *     (é o próprio fabricante), "Genérico" pro resto. O corte por fornecedor
 *     real acontece depois, no fluxo de Cotação/Fornecedor (ProdutoFornecedor),
 *     não neste campo.
 *   - Sem preço — fica 0 até ser importado via tabela de preços de fornecedor
 *     ou digitado manualmente.
 *   - Unidade de compra (ex: "ROLO 100M" pros cabos) não é guardada ainda —
 *     só a unidade de consumo. Decisão do Henrique: por ora ignorar.
 */

interface MaterialInput {
  codigo: string;
  categoria: string;
  nome: string;
  unidade: string;
  fabricante?: string; // default "Genérico" se omitido
}

const materiais: MaterialInput[] = [
  // ── CAIXAS ──────────────────────────────────────────────────────────────
  { codigo: "100601", categoria: "CAIXAS", nome: "CAIXA OCTAGONAL 6 ENTRADAS", unidade: "UN" },
  { codigo: "101001", categoria: "CAIXAS", nome: "CAIXA OCTAGONAL 10 ENTRADAS", unidade: "UN" },
  { codigo: "105158", categoria: "CAIXAS", nome: "CAIXA DE PASSAGEM 15X15X8", unidade: "UN" },
  { codigo: "105212", categoria: "CAIXAS", nome: "CAIXA DE PASSAGEM 20X20X12", unidade: "UN" },
  { codigo: "100402", categoria: "CAIXAS", nome: "CAIXA 4X2 ALVENARIA", unidade: "UN" },
  { codigo: "100404", categoria: "CAIXAS", nome: "CAIXA 4X4 ALVENARIA", unidade: "UN" },
  { codigo: "101402", categoria: "CAIXAS", nome: "CAIXA 4X2 PAREDE DE CONCRETO", unidade: "UN" },
  { codigo: "101404", categoria: "CAIXAS", nome: "CAIXA 4X4 PAREDE DE CONCRETO", unidade: "UN" },
  { codigo: "102001", categoria: "CAIXAS", nome: "CAIXA SAFEBOX", unidade: "UN" },
  { codigo: "103402", categoria: "CAIXAS", nome: "CAIXA 4X2 DRYWALL", unidade: "UN" },
  { codigo: "103404", categoria: "CAIXAS", nome: "CAIXA 4X4 DRYWALL", unidade: "UN" },
  { codigo: "108315", categoria: "CAIXAS", nome: "CAIXA DE PASSAGEM 30X30X15", unidade: "UN" },
  { codigo: "110515", categoria: "CAIXAS", nome: "CAIXA DE PASSAGEM 50X50X15", unidade: "UN" },

  // ── ACESSÓRIOS ──────────────────────────────────────────────────────────
  { codigo: "110201", categoria: "ACESSORIOS", nome: "CLIPE AFASTADOR", unidade: "UN" },

  // ── CONEXÕES ────────────────────────────────────────────────────────────
  { codigo: "212501", categoria: "CONEXOES", nome: 'LUVA DE JUNÇÃO 3/4"', unidade: "UN" },
  { codigo: "213225", categoria: "CONEXOES", nome: 'LUVA REDUTORA 1" PARA 3/4"', unidade: "UN" },
  { codigo: "214025", categoria: "CONEXOES", nome: 'LUVA REDUTORA 1 1/4" PARA 3/4"', unidade: "UN" },

  // ── ELETRODUTO ──────────────────────────────────────────────────────────
  { codigo: "202501", categoria: "ELETRODUTO", nome: "ELETR REFORCADO CORR PVC TFLEX 25MM", unidade: "M" },
  { codigo: "203201", categoria: "ELETRODUTO", nome: "ELETR REFORCADO CORR PVC TFLEX 32MM", unidade: "M" },
  { codigo: "204001", categoria: "ELETRODUTO", nome: "ELETR REFORCADO CORR PVC TFLEX 40MM", unidade: "M" },

  // ── CABOS — Flex 750V, 7 cores por bitola ──────────────────────────────
  ...gerarCabosPorBitola("1,5MM", "3015"),
  ...gerarCabosPorBitola("2,5MM", "3025"),
  ...gerarCabosPorBitola("4,0MM", "3040"),
  ...gerarCabosPorBitola("6,0MM", "3060"),
  ...gerarCabosPorBitola("10,0MM", "3010"),

  // ── CONECTORES WAGO ─────────────────────────────────────────────────────
  { codigo: "400201", categoria: "WAGO", nome: "CONECTOR WAGO 2 POLOS", unidade: "UN", fabricante: "Wago" },
  { codigo: "400301", categoria: "WAGO", nome: "CONECTOR WAGO 3 POLOS", unidade: "UN", fabricante: "Wago" },
  { codigo: "400501", categoria: "WAGO", nome: "CONECTOR WAGO 5 POLOS", unidade: "UN", fabricante: "Wago" },
  { codigo: "400801", categoria: "WAGO", nome: "CONECTOR WAGO 8 POLOS", unidade: "UN", fabricante: "Wago" },
];

/**
 * As bitolas seguem o padrão de código real informado (cada uma tem seu
 * próprio prefixo de 4 dígitos — não é uma progressão aritmética simples
 * de EE, por isso recebe o prefixo pronto em vez de calculá-lo).
 */
function gerarCabosPorBitola(bitola: string, prefixo4: string) {
  const cores: Array<[string, string]> = [
    ["01", "VERMELHO"],
    ["02", "PRETO"],
    ["03", "CINZA"],
    ["04", "AZUL"],
    ["05", "VERDE"],
    ["06", "BRANCO"],
    ["07", "AMARELO"],
  ];
  return cores.map(([vv, cor]) => ({
    codigo: `${prefixo4}${vv}`,
    categoria: "CABOS",
    nome: `CABO FLEX ${bitola} 750V ${cor}`,
    unidade: "M",
  }));
}

export async function seedMateriaisEletrico() {
  console.log(`[seed:eletrico] Sincronizando ${materiais.length} materiais do catálogo oficial HGI...`);

  let inseridos = 0;
  let atualizados = 0;
  for (const m of materiais) {
    const existing = await prisma.materialEletrico.findUnique({ where: { codigo: m.codigo } });
    if (!existing) {
      await prisma.materialEletrico.create({
        data: {
          codigo: m.codigo,
          fabricante: m.fabricante ?? "Genérico",
          categoria: m.categoria,
          nome: m.nome,
          unidade: m.unidade,
        },
      });
      inseridos++;
    } else {
      await prisma.materialEletrico.update({
        where: { codigo: m.codigo },
        data: {
          fabricante: m.fabricante ?? "Genérico",
          categoria: m.categoria,
          nome: m.nome,
          unidade: m.unidade,
        },
      });
      atualizados++;
    }
  }

  console.log(`[seed:eletrico] ${inseridos} inseridos, ${atualizados} atualizados.`);
}
