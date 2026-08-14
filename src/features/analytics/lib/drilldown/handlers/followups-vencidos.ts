import { prisma } from "@/infra/db/prisma/client";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";

/**
 * "Follow-ups vencidos" — negociações abertas cuja ÚLTIMA interação
 * tem proximaAcaoData no passado. Mesma lógica de queries.ts
 * (loop abertasNeg), pra nunca divergir do card.
 */
export const followupsVencidosHandler: DrilldownHandler = {
  titulo: "Follow-ups vencidos",
  definicao: "Negociações abertas cuja próxima ação combinada já passou da data.",
  formatoValor: "numero",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const agora = new Date();

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
        interacoesNegociacao: { orderBy: { createdAt: "desc" }, take: 1, select: { proximaAcaoData: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const vencidos = candidatos.filter((e) => {
      const ultima = e.interacoesNegociacao[0];
      return ultima?.proximaAcaoData && ultima.proximaAcaoData < agora;
    });

    const totalRegistros = vencidos.length;
    const pagina_ = vencidos.slice((pagina - 1) * tamanhoPagina, pagina * tamanhoPagina);

    const linhas = pagina_.map((e) => {
      const data = e.interacoesNegociacao[0]!.proximaAcaoData!;
      const diasAtraso = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: e.id,
        empreendimentoId: e.id,
        empreendimentoNome: e.nome,
        cliente: e.cliente.nomeFantasia ?? e.cliente.razaoSocial,
        etapa: "NEGOCIACAO",
        valor: null,
        responsavel: e.responsavelComercialUser?.nome ?? null,
        detalhe: `Vencido há ${diasAtraso} dia(s)`,
        href: `/empreendimentos/${e.id}/negociacao`,
      };
    });

    return { valorConsolidado: totalRegistros, totalRegistros, linhas };
  },
};
