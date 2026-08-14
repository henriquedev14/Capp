import { prisma } from "@/infra/db/prisma/client";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";

/**
 * "OPs atrasadas" — Ordem de Produção com prazo vencido, ainda não
 * concluída. Mesma lógica de queries.ts (ordensAtrasadas).
 */
export const opsAtrasadasHandler: DrilldownHandler = {
  titulo: "Ordens de produção atrasadas",
  definicao: "Ordens de Produção com prazo já vencido, ainda não concluídas.",
  formatoValor: "numero",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const agora = new Date();

    const where = {
      prazo: { lt: agora, not: null },
      status: { not: "CONCLUIDA" as const },
      ...(filtros.empreendimentoId && { tipologia: { empreendimentoId: filtros.empreendimentoId } }),
    };

    const [totalRegistros, itens] = await Promise.all([
      prisma.ordemProducao.count({ where }),
      prisma.ordemProducao.findMany({
        where,
        select: {
          id: true,
          numero: true,
          prazo: true,
          quantidadeAlvo: true,
          quantidadeAprovada: true,
          tipologia: { select: { nome: true, empreendimentoId: true, empreendimento: { select: { nome: true } } } },
        },
        orderBy: { prazo: "asc" },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
    ]);

    const linhas = itens.map((o) => {
      const diasAtraso = o.prazo ? Math.floor((agora.getTime() - o.prazo.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        id: o.id,
        empreendimentoId: o.tipologia.empreendimentoId,
        empreendimentoNome: o.tipologia.empreendimento.nome,
        cliente: null,
        etapa: o.tipologia.nome,
        valor: null,
        responsavel: null,
        detalhe: `${o.numero} · ${o.quantidadeAprovada}/${o.quantidadeAlvo} · atrasada há ${diasAtraso}d`,
        href: `/empreendimentos/${o.tipologia.empreendimentoId}/producao`,
      };
    });

    return { valorConsolidado: totalRegistros, totalRegistros, linhas };
  },
};
