export type SubtipoHidraulico = "ESGOTO" | "PEX" | "AGUA_QUENTE" | "AGUA_FRIA";
export type StatusLevantamentoHidraulico = "RASCUNHO" | "VALIDADO";

export const SUBTIPOS_HIDRAULICO: { value: SubtipoHidraulico; label: string }[] = [
  { value: "PEX", label: "PEX" },
  { value: "AGUA_FRIA", label: "Água Fria" },
  { value: "AGUA_QUENTE", label: "Água Quente" },
  { value: "ESGOTO", label: "Esgoto" },
];

export interface ItemLevantamentoHidraulico {
  id: string;
  levantamentoId: string;
  materialPexId?: string | null;
  descricao: string;
  categoria?: string | null;
  diametro?: string | null;
  unidade: string;
  quantidade: number;
  createdAt: Date;
}

export interface LevantamentoHidraulico {
  id: string;
  empreendimentoId: string;
  tipologiaId: string;
  tipologiaNome?: string;
  subtipo: SubtipoHidraulico;
  status: StatusLevantamentoHidraulico;
  observacoes?: string | null;
  itens: ItemLevantamentoHidraulico[];
  criadoPorId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumoItemAgrupado {
  descricao: string;
  categoria: string | null;
  diametro: string | null;
  unidade: string;
  quantidadeTotal: number;
}

/** Agrupa itens repetidos (mesma descrição+diâmetro+unidade) somando quantidades. */
export function agruparItens(itens: ItemLevantamentoHidraulico[]): ResumoItemAgrupado[] {
  const mapa = new Map<string, ResumoItemAgrupado>();
  for (const item of itens) {
    const key = `${item.descricao}::${item.diametro ?? ""}::${item.unidade}`;
    const existente = mapa.get(key);
    if (existente) {
      existente.quantidadeTotal += item.quantidade;
    } else {
      mapa.set(key, {
        descricao: item.descricao,
        categoria: item.categoria ?? null,
        diametro: item.diametro ?? null,
        unidade: item.unidade,
        quantidadeTotal: item.quantidade,
      });
    }
  }
  return Array.from(mapa.values()).sort((a, b) => {
    const catCompare = (a.categoria ?? "").localeCompare(b.categoria ?? "");
    if (catCompare !== 0) return catCompare;
    return a.descricao.localeCompare(b.descricao);
  });
}
