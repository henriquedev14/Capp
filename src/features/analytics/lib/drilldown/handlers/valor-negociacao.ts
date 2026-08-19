import { prisma } from "@/infra/db/prisma/client";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";
import { resolverValorNegociadoAtual } from "@/core/negociacao/use-cases/status-negociacao";

function n(v: unknown): number {
  return v == null ? 0 : Number(v);
}

/**
 * "Valor em negociação" — última posição negociada de verdade (a
 * interação mais recente COM valor, não necessariamente a interação
 * mais recente de qualquer tipo — um follow-up sem valor não apaga
 * uma renegociação anterior), só empreendimentos EXATAMENTE em
 * NEGOCIACAO, sem Legado (Legado não passa por essa etapa — acordado
 * com o Henrique). Mesma fonte que carregarAnalyticsData e o
 * drill-down de Carteira ativa usam (resolverValorNegociadoAtual) —
 * unificado numa auditoria em 19/08/2026, que achou esta tela usando
 * uma versão simplificada (só a interação mais recente, `take: 1`)
 * que podia mostrar o valor errado nesse caso específico.
 */
export const valorNegociacaoHandler: DrilldownHandler = {
  titulo: "Valor em negociação",
  definicao: "Última posição negociada dos empreendimentos atualmente em Negociação. Não soma revisões antigas.",
  formatoValor: "moeda",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const where = {
      status: "NEGOCIACAO" as const,
      origemLegado: false,
      excluidoEm: null,
      ...(filtros.clienteId && { clienteId: filtros.clienteId }),
      ...(filtros.empreendimentoId && { id: filtros.empreendimentoId }),
      ...(filtros.responsavelId && { responsavelComercialUserId: filtros.responsavelId }),
      ...(filtros.tier != null && { tier: filtros.tier }),
    };

    const [totalRegistros, itens] = await Promise.all([
      prisma.empreendimento.count({ where }),
      prisma.empreendimento.findMany({
        where,
        select: {
          id: true,
          nome: true,
          cliente: { select: { razaoSocial: true, nomeFantasia: true } },
          responsavelComercialUser: { select: { nome: true } },
          orcamentos: { orderBy: { revisao: "desc" }, take: 1, select: { totalServicosHgi: true, totalMateriais: true } },
          interacoesNegociacao: {
            select: { createdAt: true, valorNegociado: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
    ]);

    let valorConsolidado = 0;
    const linhas = itens.map((e) => {
      const valorOrcamento = n(e.orcamentos[0]?.totalServicosHgi) + n(e.orcamentos[0]?.totalMateriais);
      const interacoesConvertidas = e.interacoesNegociacao.map((i) => ({
        createdAt: i.createdAt,
        valorNegociado: i.valorNegociado != null ? n(i.valorNegociado) : null,
      }));
      const teveValorNegociado = interacoesConvertidas.some((i) => i.valorNegociado != null);
      const valor = resolverValorNegociadoAtual(interacoesConvertidas, valorOrcamento);
      valorConsolidado += valor;
      return {
        id: e.id,
        empreendimentoId: e.id,
        empreendimentoNome: e.nome,
        cliente: e.cliente.nomeFantasia ?? e.cliente.razaoSocial,
        etapa: "NEGOCIACAO",
        valor,
        responsavel: e.responsavelComercialUser?.nome ?? null,
        detalhe: teveValorNegociado ? "Valor renegociado" : "Valor original do orçamento",
        href: `/empreendimentos/${e.id}/negociacao`,
      };
    });

    return { valorConsolidado, totalRegistros, linhas };
  },
};
