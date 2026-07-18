export type TipoEletroduto = "LAJE" | "VERTICAL" | "PISO";
export type CorCabo = "vermelho" | "preto" | "azul" | "verde" | "amarelo" | "branco" | "cinza";

export const DIAMETROS_ELETRODUTO = ['3/4"', '1"', '1.1/4"', '1.1/2"'] as const;
export type DiametroEletroduto = typeof DIAMETROS_ELETRODUTO[number];

export interface CircuitoCatalogo {
  id: string;
  empreendimentoId: string;
  numero: number;
  descricao: string;
  bitola: number;
  temVermelho: boolean;
  temPreto: boolean;
  temAzul: boolean;
  temVerde: boolean;
  temAmarelo: boolean;
  temBranco: boolean;
  temCinza: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CircuitoPeca {
  id: string;
  pecaId: string;
  catalogoId?: string | null;
  bitola: number;
  circuito?: number | null;
  temVermelho: boolean;
  temPreto: boolean;
  temAzul: boolean;
  temVerde: boolean;
  temAmarelo: boolean;
  temBranco: boolean;
  temCinza: boolean;
  identRetorno?: string | null;
  ehParalelo: boolean;
  ehRetorno: boolean;
  sobraOverride?: number | null;
  // Distância própria desta linha — quando presente, usa essa em vez do
  // horiz/vertical/laje da peça pra calcular o comprimento REAL do cabo
  // (não afeta o cálculo de ELETRODUTO, que é sempre por peça).
  horizOverride?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PecaLevantamento {
  id: string;
  levantamentoId: string;
  numero: number;
  kit: TipoEletroduto;
  local?: string | null;
  trecho: string;
  obs?: string | null;
  vertical1: number;
  laje1: number;
  horiz: number;
  laje2: number;
  vertical2: number;
  diametro: string;
  sobra: number;
  circuitos: CircuitoPeca[];
  createdAt: Date;
  updatedAt: Date;
}

export type StatusLevantamento = "RASCUNHO" | "VALIDADO";

export interface LevantamentoEletrico {
  id: string;
  empreendimentoId: string;
  tipologiaId: string;
  tipologiaNome?: string;
  status: StatusLevantamento;
  revisao: number;
  observacoes?: string | null;
  peDireito: number;
  // Totais oficiais lidos direto da tabela consolidada da planilha
  // importada (não recalculados) — quando presente, tem prioridade sobre
  // calcularTotais nas telas e sugestões de material.
  totaisImportadosJson?: string | null;
  pecas: PecaLevantamento[];
  criadoPorId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CALCULOS - replica logica do VBA AtualizarTerraBloco e totais
// ============================================================================

/**
 * Comprimento do eletroduto físico (SEM sobra).
 * Usado para calcular o total de eletrodutos por diâmetro.
 */
export function calcularComprimentoEletroduto(
  peca: Pick<PecaLevantamento, "vertical1" | "laje1" | "horiz" | "laje2" | "vertical2">
): number {
  return Math.round(
    (peca.vertical1 + peca.laje1 + peca.horiz + peca.laje2 + peca.vertical2) * 1000
  ) / 1000;
}

/**
 * Comprimento real do cabo (COM sobra).
 * Usado para calcular o total de cabos por bitola/cor.
 *
 * horizOverride: quando uma linha de fio tem distância própria diferente
 * da peça (formato "PARAMETROS" de importação, onde várias linhas de fio
 * no mesmo trecho físico podem ter comprimentos ligeiramente diferentes),
 * usa esse valor no lugar da soma dos campos da peça. Não afeta eletroduto
 * — pipe físico é sempre da peça, não da linha de fio.
 */
export function calcularComprimentoReal(
  peca: Pick<PecaLevantamento, "vertical1" | "laje1" | "horiz" | "laje2" | "vertical2" | "sobra">,
  sobraOverride?: number | null,
  horizOverride?: number | null
): number {
  const base =
    horizOverride != null
      ? horizOverride
      : peca.vertical1 + peca.laje1 + peca.horiz + peca.laje2 + peca.vertical2;
  const sobra = sobraOverride ?? peca.sobra;
  return Math.round((base + sobra) * 1000) / 1000;
}

export interface TotalCabo {
  bitola: number;
  cor: CorCabo;
  metros: number;
}

export interface TotalEletroduto {
  diametro: string;
  metros: number;
}

export interface TotaisLevantamento {
  cabos: TotalCabo[];
  eletrodutos: TotalEletroduto[];
}

/**
 * Calcula totais de cabos e eletrodutos.
 *
 * ELETRODUTO: soma do comprimento FÍSICO (sem sobra) — coluna ELETRO da planilha.
 * CABOS: soma do comprimento REAL (com sobra) — coluna REAL da planilha.
 * TERRA (verde): vai apenas no circuito de maior bitola de cada peça,
 * ignorando paralelo e retorno — idêntico ao AtualizarTerraBloco do VBA.
 */
export function calcularTotais(pecas: PecaLevantamento[]): TotaisLevantamento {
  const cabosMap = new Map<string, number>();
  const eletrodutosMap = new Map<string, number>();

  for (const peca of pecas) {
    // Eletroduto: comprimento FÍSICO (sem sobra)
    const compEletro = calcularComprimentoEletroduto(peca);
    eletrodutosMap.set(peca.diametro, (eletrodutosMap.get(peca.diametro) ?? 0) + compEletro);

    // Determina qual circuito recebe o terra (maior bitola, ignora paralelo/retorno)
    let maiorBitola = 0;
    let idxTerra = -1;
    peca.circuitos.forEach((c, i) => {
      if (!c.ehParalelo && !c.ehRetorno && c.bitola > maiorBitola) {
        maiorBitola = c.bitola;
        idxTerra = i;
      }
    });

    // Cabos: comprimento REAL (com sobra, e distância própria se houver)
    peca.circuitos.forEach((circ, idx) => {
      const comp = calcularComprimentoReal(peca, circ.sobraOverride, circ.horizOverride);
      const ehTerra = idx === idxTerra;

      const fios: { cor: CorCabo; ativo: boolean }[] = [
        { cor: "vermelho", ativo: circ.temVermelho },
        { cor: "preto",    ativo: circ.temPreto },
        { cor: "azul",     ativo: circ.temAzul },
        { cor: "verde",    ativo: ehTerra }, // terra só no de maior bitola
        { cor: "amarelo",  ativo: circ.temAmarelo },
        { cor: "branco",   ativo: circ.temBranco },
        { cor: "cinza",    ativo: circ.temCinza },
      ];

      for (const { cor, ativo } of fios) {
        if (!ativo) continue;
        const key = `${circ.bitola}:${cor}`;
        cabosMap.set(key, (cabosMap.get(key) ?? 0) + comp);
      }
    });
  }

  const cabos: TotalCabo[] = Array.from(cabosMap.entries())
    .map(([key, metros]) => {
      const parts = key.split(":");
      return {
        bitola: parseFloat(parts[0] ?? "0"),
        cor: (parts[1] ?? "vermelho") as CorCabo,
        metros: Math.round(metros * 100) / 100,
      };
    })
    .sort((a, b) => a.bitola - b.bitola || a.cor.localeCompare(b.cor));

  const eletrodutos: TotalEletroduto[] = Array.from(eletrodutosMap.entries())
    .map(([diametro, metros]) => ({
      diametro,
      metros: Math.round(metros * 100) / 100,
    }))
    .sort((a, b) => a.diametro.localeCompare(b.diametro));

  return { cabos, eletrodutos };
}

/**
 * Conta os pontos de laje (luminária) únicos de um levantamento — usados
 * na precificação por Ponto L. Um "ponto L" é qualquer marcação "L" +
 * número (L1, L2, L23...) que aparece nos trechos das peças, seguindo a
 * mesma convenção da planilha original da HGI (L = ponto de teto/laje,
 * T = tomada, não contado aqui).
 *
 * Deduplica: se "L1" aparece em vários trechos (ex: "QDC-L1" e "L1-L2"),
 * conta como 1 ponto só.
 */
export function contarPontosL(pecas: PecaLevantamento[]): number {
  const pontos = new Set<string>();
  for (const peca of pecas) {
    const tokens = peca.trecho.split(/[-/\s]+/).map((t) => t.trim());
    for (const token of tokens) {
      if (/^L\d+$/i.test(token)) {
        pontos.add(token.toUpperCase());
      }
    }
  }
  return pontos.size;
}
