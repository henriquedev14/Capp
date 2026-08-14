import { prisma } from "@/infra/db/prisma/client";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";

/**
 * "Sem interação > 7 dias" — negociações abertas (status NEGOCIACAO,
 * sem Legado) cuja última interação registrada é mais antiga que 7
 * dias, ou que nunca tiveram nenhuma interação registrada.
 */
export const semInteracao7dHandler: DrilldownHandler = {
  titulo: "Sem interação > 7 dias",
  definicao: "Negociações abertas sem nenhum contato/registro nos últimos 7 dias.",
  formatoValor: "numero",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const where = {
      status: "NEGOCIACAO" as const,
      origemLegado: false,
      excluidoEm: null,
      ...(filtros.clienteId && { clienteId: filtros.clienteId }),
      ...(filtros.responsavelId && { responsavelComercialUserId: filtros.responsavelId }),
    };

    const candidatos = await prisma.empreendimento.findMany({
      where,
      select: {
        id: true,
        nome: true,
        cliente: { select: { razaoSocial: true, nomeFantasia: true } },
        responsavelComercialUser: { select: { nome: true } },
        interacoesNegociacao: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const semInteracao = candidatos.filter((e) => {
      const ultima = e.interacoesNegociacao[0];
      return !ultima || ultima.createdAt < seteDiasAtras;
    });

    const totalRegistros = semInteracao.length;
    const pagina_ = semInteracao.slice((pagina - 1) * tamanhoPagina, pagina * tamanhoPagina);

    const linhas = pagina_.map((e) => {
      const ultima = e.interacoesNegociacao[0];
      const dias = ultima ? Math.floor((Date.now() - ultima.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
      return {
        id: e.id,
        empreendimentoId: e.id,
        empreendimentoNome: e.nome,
        cliente: e.cliente.nomeFantasia ?? e.cliente.razaoSocial,
        etapa: "NEGOCIACAO",
        valor: null,
        responsavel: e.responsavelComercialUser?.nome ?? null,
        detalhe: dias != null ? `${dias} dias sem interação` : "Nunca teve interação registrada",
        href: `/empreendimentos/${e.id}/negociacao`,
      };
    });

    return { valorConsolidado: totalRegistros, totalRegistros, linhas };
  },
};
