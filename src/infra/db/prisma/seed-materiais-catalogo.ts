import { prisma } from "@/infra/db/prisma/client";

/**
 * Seed do catálogo de materiais elétrico/QDC — dados reais extraídos de
 * uma proposta HGI (QDC Pacaembu), usados como ponto de partida real em
 * vez de valores inventados. Os preços são de referência e podem ser
 * ajustados depois na tela de administração.
 */

interface MaterialInput {
  fabricante: string;
  descricao: string;
  unidade?: string;
  precoUnitario: number;
  kit?: "ELETRICO" | "QDC";
}

const materiais: MaterialInput[] = [
  // ── NANOPLASTICOS ──────────────────────────────────────────────────────
  { fabricante: "Nanoplasticos", descricao: "Caixa Teto - 6 Posições", precoUnitario: 2.10 },
  { fabricante: "Nanoplasticos", descricao: "Caixa 4x4 Parede Concreto", precoUnitario: 3.70 },
  { fabricante: "Nanoplasticos", descricao: "Caixa 4x2 Parede Concreto", precoUnitario: 2.50 },
  { fabricante: "Nanoplasticos", descricao: "Caixa 4x2 Drywall", precoUnitario: 1.99 },
  { fabricante: "Nanoplasticos", descricao: "Luva 3/4\"", precoUnitario: 0.40 },
  { fabricante: "Nanoplasticos", descricao: "Luva Adaptador 1\" para 3/4\"", precoUnitario: 0.75 },

  // ── TIGRE ──────────────────────────────────────────────────────────────
  { fabricante: "Tigre", descricao: "Eletroduto Reforçado Corrugado PVC TFlex 25mm", unidade: "M", precoUnitario: 1.79 },
  { fabricante: "Tigre", descricao: "Eletroduto Reforçado Corrugado PVC TFlex 32mm", unidade: "M", precoUnitario: 3.20 },

  // ── MEGATROM (cabos) ───────────────────────────────────────────────────
  { fabricante: "Megatrom", descricao: "Cabo Flex 2,5mm 750V — Vermelho", unidade: "M", precoUnitario: 1.88 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 2,5mm 750V — Preto", unidade: "M", precoUnitario: 1.88 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 2,5mm 750V — Azul", unidade: "M", precoUnitario: 1.88 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 2,5mm 750V — Verde", unidade: "M", precoUnitario: 1.88 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 2,5mm 750V — Amarelo", unidade: "M", precoUnitario: 1.88 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 6,0mm 750V — Preto", unidade: "M", precoUnitario: 4.40 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 6,0mm 750V — Azul", unidade: "M", precoUnitario: 4.40 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 6,0mm 750V — Verde", unidade: "M", precoUnitario: 4.40 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 10,0mm 750V — Preto", unidade: "M", precoUnitario: 9.40 },
  { fabricante: "Megatrom", descricao: "Cabo Flex 10,0mm 750V — Azul", unidade: "M", precoUnitario: 9.40 },

  // ── WAGO ───────────────────────────────────────────────────────────────
  { fabricante: "Wago", descricao: "Conector Wago 2 Pólos", precoUnitario: 1.74 },
  { fabricante: "Wago", descricao: "Conector Wago 3 Pólos", precoUnitario: 2.14 },
  { fabricante: "Wago", descricao: "Conector Wago 5 Pólos", precoUnitario: 3.44 },
  { fabricante: "Wago", descricao: "Frete Wago", precoUnitario: 2000.00 },
  { fabricante: "Wago", descricao: "Imposto IPI Wago", precoUnitario: 0 },

  // ── PETROPLAST ─────────────────────────────────────────────────────────
  { fabricante: "Petroplast", descricao: "Fita de Arquear", unidade: "M", precoUnitario: 0.11 },

  // ── DAVIN (QDC) ────────────────────────────────────────────────────────
  { fabricante: "Davin", descricao: "Quadro Distribuição 24 Posições — Base + Tampa", precoUnitario: 103.82, kit: "QDC" },
  { fabricante: "Davin", descricao: "Quadro Distribuição 12 Posições — Base + Tampa", precoUnitario: 64.60, kit: "QDC" },

  // ── TAF (componentes de QDC) ───────────────────────────────────────────
  { fabricante: "TAF", descricao: "Barramento Fase p/ Disjuntor, Bifásico, 80A, 54x2", precoUnitario: 73.42, kit: "QDC" },
  { fabricante: "TAF", descricao: "Barramento Fase p/ Disjuntor, Bifásico, 80A, 12 Posições", precoUnitario: 9.52, kit: "QDC" },
  { fabricante: "TAF", descricao: "Barramento Fase p/ Disjuntor, Mono Bifásico, 80A, 12 Posições", precoUnitario: 8.99, kit: "QDC" },
  { fabricante: "TAF", descricao: "Barramento Neutro com Base", precoUnitario: 9.05, kit: "QDC" },
  { fabricante: "TAF", descricao: "Barramento Terra com Base", precoUnitario: 9.05, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Monopolar 1x10A", precoUnitario: 5.52, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Monopolar 1x16A", precoUnitario: 5.52, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Monopolar 1x20A", precoUnitario: 5.52, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Monopolar 1x25A", precoUnitario: 5.08, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Monopolar 1x32A", precoUnitario: 5.08, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Monopolar 1x50A", precoUnitario: 6.20, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Bipolar 2x16A", precoUnitario: 19.84, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Bipolar 2x40A", precoUnitario: 20.48, kit: "QDC" },
  { fabricante: "TAF", descricao: "Disjuntor Termomagnético, Padrão DIN, Bipolar 2x63A", precoUnitario: 20.48, kit: "QDC" },
  { fabricante: "TAF", descricao: "Interruptor Diferencial DR, Tetrapolar 4x63A", precoUnitario: 63.56, kit: "QDC" },
  { fabricante: "TAF", descricao: "Interruptor Diferencial DR, Tetrapolar 2x25A", precoUnitario: 55.25, kit: "QDC" },
  { fabricante: "TAF", descricao: "Interruptor Diferencial DR, Bipolar 2x63A", precoUnitario: 55.25, kit: "QDC" },
  { fabricante: "TAF", descricao: "Conector Genérico", precoUnitario: 4.24, kit: "QDC" },
  { fabricante: "TAF", descricao: "Isolador p/ Barramento Tipo Pente com 5 Unidades", precoUnitario: 2.37, kit: "QDC" },
  { fabricante: "TAF", descricao: "Imposto IPI", precoUnitario: 0, kit: "QDC" },

  // ── FRONTEC ────────────────────────────────────────────────────────────
  { fabricante: "Frontec", descricao: "Abraçadeira", precoUnitario: 0.1404 },
  { fabricante: "Frontec", descricao: "Anilha de Identificação Número 1", precoUnitario: 0.0491 },
  { fabricante: "Frontec", descricao: "Anilha de Identificação Número 2", precoUnitario: 0.0491 },
  { fabricante: "Frontec", descricao: "Anilha de Identificação Número 3", precoUnitario: 0.0491 },
  { fabricante: "Frontec", descricao: "Anilha de Identificação Número 4", precoUnitario: 0.0491 },
  { fabricante: "Frontec", descricao: "Anilha de Identificação Número 5", precoUnitario: 0.0491 },
  { fabricante: "Frontec", descricao: "Anilha de Identificação Número 6", precoUnitario: 0.0491 },
  { fabricante: "Frontec", descricao: "Anilha de Identificação Número 7", precoUnitario: 0.0491 },
  { fabricante: "Frontec", descricao: "Anilha de Identificação Letra C", precoUnitario: 0.0491 },

  // ── LOJA ELÉTRICA ──────────────────────────────────────────────────────
  { fabricante: "Loja Elétrica", descricao: "Mangueira Corrugada 1 1/4\" — PEAD", unidade: "M", precoUnitario: 0 },
  { fabricante: "Loja Elétrica", descricao: "Terminal Ilhós 16,0mm", precoUnitario: 0.61 },
  { fabricante: "Loja Elétrica", descricao: "Terminal Ilhós 16,0mm Duplo", precoUnitario: 1.20 },
  { fabricante: "Loja Elétrica", descricao: "Terminal Ilhós 10,0mm", precoUnitario: 0.58 },
  { fabricante: "Loja Elétrica", descricao: "Terminal Ilhós 6,0mm", precoUnitario: 0.38 },
  { fabricante: "Loja Elétrica", descricao: "Terminal Ilhós 1,5mm", precoUnitario: 0.185 },
  { fabricante: "Loja Elétrica", descricao: "Terminal Ilhós 2,5mm", precoUnitario: 0.1967 },
  { fabricante: "Loja Elétrica", descricao: "Cabo Flex Preto 16,00mm", precoUnitario: 13.54 },
  { fabricante: "Loja Elétrica", descricao: "Cabo Flex Azul 16,00mm", precoUnitario: 13.54 },
  { fabricante: "Loja Elétrica", descricao: "Cabo Flex Verde 16,00mm", precoUnitario: 13.54 },
  { fabricante: "Loja Elétrica", descricao: "Cabo Flex Preto 10,00mm", precoUnitario: 12.99 },
  { fabricante: "Loja Elétrica", descricao: "Cabo Flex Azul 10,00mm", precoUnitario: 12.99 },

  // ── B.LUX (acabamento) ─────────────────────────────────────────────────
  { fabricante: "B.Lux", descricao: "Placa 4x2 com 1 Tecla Simples (Branca)", precoUnitario: 4.94 },
  { fabricante: "B.Lux", descricao: "Placa 4x2 com 2 Tecla Simples (Branca)", precoUnitario: 6.98 },
  { fabricante: "B.Lux", descricao: "Placa 4x2 com 1 Tomada 10A (Branca)", precoUnitario: 4.55 },
  { fabricante: "B.Lux", descricao: "Placa 4x2 com 1 Tomada 20A (Branca)", precoUnitario: 5.27 },
  { fabricante: "B.Lux", descricao: "Placa 4x2 com Furo 11mm (Branca)", precoUnitario: 2.81 },
  { fabricante: "B.Lux", descricao: "Placa 4x2 Cega", precoUnitario: 2.83 },
  { fabricante: "B.Lux", descricao: "Placa 4x2 Pulsador Campainha", precoUnitario: 6.12 },
  { fabricante: "B.Lux", descricao: "Campainha Cigarra", precoUnitario: 24.50 },
  { fabricante: "B.Lux", descricao: "Imposto IPI", precoUnitario: 0 },
];

export async function seedMateriaisCatalogo() {
  console.log(`[seed:catalogo] Inserindo ${materiais.length} materiais do catálogo elétrico/QDC...`);

  let inseridos = 0;
  for (const m of materiais) {
    const existente = await prisma.materialEletrico.findFirst({
      where: { fabricante: m.fabricante, nome: m.descricao },
    });
    if (!existente) {
      await prisma.materialEletrico.create({
        data: {
          fabricante: m.fabricante,
          categoria: m.fabricante, // sem quebra fina de categoria por enquanto
          nome: m.descricao,
          unidade: m.unidade ?? "UN",
          precoUnitario: m.precoUnitario,
          kit: m.kit ?? "ELETRICO",
        },
      });
      inseridos++;
    }
  }

  console.log(`[seed:catalogo] ${inseridos} materiais inseridos (${materiais.length - inseridos} já existiam).`);
}
