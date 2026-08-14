import { prisma } from "@/infra/db/prisma/client";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";

function n(v: unknown): number {
  return v == null ? 0 : Number(v);
}

/**
 * "Carteira ativa" — todo empreendimento que não chegou em
 * CONCLUIDO/ARQUIVADO. Mesmo filtro usado em carregarAnalyticsData
 * (linha "const ativos = ..."), pra nunca divergir do card.
 */
export const carteiraAtivaHandler: DrilldownHandler = {
  titulo: "Carteira ativa",
  definicao: "Empreendimentos que ainda não chegaram em Concluído ou Arquivado — inclui Legado.",
  formatoValor: "numero",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const where = {
      status: { notIn: ["CONCLUIDO", "ARQUIVADO"] as const },
      excluidoEm: null,
      ...(filtros.clienteId && { clienteId: filtros.clienteId }),
      ...(filtros.empreendimentoId && { id: filtros.empreendimentoId }),
      ...(filtros.etapa && { status: filtros.etapa as never }),
      ...(filtros.responsavelId && { responsavelComercialUserId: filtros.responsavelId }),
      ...(filtros.origem === "LEGADO" && { origemLegado: true }),
      ...(filtros.origem === "NORMAL" && { origemLegado: false }),
      ...(filtros.tier != null && { tier: filtros.tier }),
    };

    const [totalRegistros, itens] = await Promise.all([
      prisma.empreendimento.count({ where }),
      prisma.empreendimento.findMany({
        where,
        select: {
          id: true,
          nome: true,
          status: true,
          origemLegado: true,
          legadoValorContratado: true,
          cliente: { select: { razaoSocial: true, nomeFantasia: true } },
          responsavelComercialUser: { select: { nome: true } },
          orcamentos: { orderBy: { revisao: "desc" }, take: 1, select: { totalServicosHgi: true, totalMateriais: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
    ]);

    const linhas = itens.map((e) => {
      const valor = e.origemLegado
        ? n(e.legadoValorContratado)
        : n(e.orcamentos[0]?.totalServicosHgi) + n(e.orcamentos[0]?.totalMateriais);
      return {
        id: e.id,
        empreendimentoId: e.id,
        empreendimentoNome: e.nome,
        cliente: e.cliente.nomeFantasia ?? e.cliente.razaoSocial,
        etapa: e.status,
        valor,
        responsavel: e.responsavelComercialUser?.nome ?? null,
        detalhe: e.origemLegado ? "Legado" : null,
        href: `/empreendimentos/${e.id}`,
      };
    });

    return { valorConsolidado: totalRegistros, totalRegistros, linhas };
  },
};
