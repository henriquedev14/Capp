import { prisma } from "@/infra/db/prisma/client";

// Cores usadas na identificação de condutores (fase/neutro/terra/retorno)
// — importam pro Levantamento e pra Produção (cabo tem que vir na cor
// certa pra cada função elétrica), mas NÃO importam pra Orçamento/Cotação:
// o que muda o preço e a compra é a bitola (seção em mm²) e a tensão, não
// a cor. Duas linhas "CABO 2,5MM 750V VERMELHO" e "...AZUL" custam o
// mesmo e vêm do mesmo fornecedor — por isso consolidam numa linha só
// aqui, mesmo sendo materiais com FK de catálogo diferentes.
const CORES_CONDUTOR = [
  "VERMELHO", "PRETO", "AZUL", "VERDE", "AMARELO", "BRANCO",
  "CINZA", "MARROM", "LARANJA", "ROSA", "VIOLETA",
];

function chaveConsolidacao(descricao: string): string {
  let chave = descricao.toUpperCase();
  for (const cor of CORES_CONDUTOR) {
    chave = chave.replace(new RegExp(`\\b${cor}\\b`, "g"), "").trim();
  }
  return chave.replace(/\s+/g, " ").trim();
}

// Item consolidado do levantamento de um empreendimento inteiro.
// Soma quantidade × quantidadeUnidades para todas as tipologias.
export interface ItemConsolidado {
  materialEletricoId: string;
  fabricante: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  kit: string;
  // Origem: quais tipologias contribuíram — útil pra aviso/debug e
  // para o snapshot do CotacaoItem se precisar.
  tipologias: { tipologiaNome: string; quantidade: number; unidades: number }[];
}

/**
 * Consolida o levantamento de materiais de TODAS as tipologias validadas
 * do empreendimento em uma única lista, com quantidades já multiplicadas
 * por `Tipologia.quantidadeUnidades`.
 *
 * IMPORTANTE:
 * - Só considera levantamentos com status=VALIDADO. Rascunhos são ignorados
 *   (fluxo formal já usado no Bloco 2 do Orçamento).
 * - Requer materialEletricoId preenchido em cada item — itens antigos sem
 *   FK são pulados (não dá pra fazer matching exato com o ProdutoFornecedor).
 *   Isso é raro na prática, mas se aparecer avisamos no retorno.
 */
export async function consolidarLevantamentoMateriais(
  empreendimentoId: string
): Promise<{
  itens: ItemConsolidado[];
  itensSemFk: number; // avisos: itens do levantamento sem materialEletricoId
  levantamentosValidados: number;
}> {
  const levantamentos = await prisma.levantamentoMateriais.findMany({
    where: { empreendimentoId, status: "VALIDADO" },
    include: {
      tipologia: { select: { nome: true, quantidadeUnidades: true } },
      itens: true,
    },
  });

  // Chave: descrição sem cor (bitola) → agrega qtd × unidades por
  // tipologia, juntando variantes de cor do mesmo cabo numa linha só.
  const mapa = new Map<string, ItemConsolidado>();
  let itensSemFk = 0;

  for (const lev of levantamentos) {
    const unidades = lev.tipologia.quantidadeUnidades;
    const tipoNome = lev.tipologia.nome;

    for (const item of lev.itens) {
      if (!item.materialEletricoId) {
        itensSemFk++;
        continue;
      }
      const qtdItem = Number(item.quantidade) * unidades;
      const chave = chaveConsolidacao(item.descricao);

      const existente = mapa.get(chave);
      if (existente) {
        existente.quantidade += qtdItem;
        existente.tipologias.push({
          tipologiaNome: tipoNome,
          quantidade: Number(item.quantidade),
          unidades,
        });
      } else {
        mapa.set(chave, {
          // Guarda o ID da PRIMEIRA variante de cor encontrada — serve só
          // de referência (ex: link pro catálogo), não afeta o cálculo.
          materialEletricoId: item.materialEletricoId,
          fabricante: item.fabricante,
          descricao: chave, // descrição já sem a cor, pra exibição
          unidade: item.unidade,
          quantidade: qtdItem,
          // Kit não vem do item do levantamento (o snapshot só tem
          // fabricante/descricao/unidade). Vamos preencher depois olhando
          // no MaterialEletrico global.
          kit: "ELETRICO",
          tipologias: [
            { tipologiaNome: tipoNome, quantidade: Number(item.quantidade), unidades },
          ],
        });
      }
    }
  }

  // Preenche o kit (ELETRICO/QDC) do catálogo global — necessário para os
  // subtotais TOTAL ELÉTRICA / TOTAL P/QDC do documento QDC.
  const ids = Array.from(mapa.values()).map((it) => it.materialEletricoId);
  if (ids.length > 0) {
    const materiais = await prisma.materialEletrico.findMany({
      where: { id: { in: ids } },
      select: { id: true, kit: true },
    });
    const kitPorId = new Map(materiais.map((m) => [m.id, m.kit]));
    for (const it of mapa.values()) {
      const kit = kitPorId.get(it.materialEletricoId);
      if (kit) it.kit = kit;
    }
  }

  return {
    itens: Array.from(mapa.values()),
    itensSemFk,
    levantamentosValidados: levantamentos.length,
  };
}
