import { prisma } from "@/infra/db/prisma/client";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";

function n(v: unknown): number {
  return v == null ? 0 : Number(v);
}

/**
 * "Vencido" — Contas a Receber pendentes (recebido=false) com
 * dataPrevista no passado. Mesma lógica de queries.ts (vencidas).
 */
export const financeiroVencidoHandler: DrilldownHandler = {
  titulo: "Contas a receber vencidas",
  definicao: "Títulos ainda não recebidos cuja data prevista já passou.",
  formatoValor: "moeda",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const agora = new Date();

    const where = {
      recebido: false,
      dataPrevista: { lt: agora, not: null },
      ...(filtros.empreendimentoId && { empreendimentoId: filtros.empreendimentoId }),
      ...(filtros.clienteId && { empreendimento: { clienteId: filtros.clienteId } }),
    };

    const [totalRegistros, itens, soma] = await Promise.all([
      prisma.contaReceber.count({ where }),
      prisma.contaReceber.findMany({
        where,
        select: {
          id: true,
          tipo: true,
          valor: true,
          dataPrevista: true,
          empreendimento: { select: { id: true, nome: true, cliente: { select: { razaoSocial: true, nomeFantasia: true } } } },
        },
        orderBy: { dataPrevista: "asc" },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      prisma.contaReceber.aggregate({ where, _sum: { valor: true } }),
    ]);

    const valorConsolidado = n(soma._sum.valor);

    const linhas = itens.map((c) => {
      const diasAtraso = c.dataPrevista ? Math.floor((agora.getTime() - c.dataPrevista.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        id: c.id,
        empreendimentoId: c.empreendimento?.id ?? null,
        empreendimentoNome: c.empreendimento?.nome ?? "Avulso",
        cliente: c.empreendimento?.cliente ? (c.empreendimento.cliente.nomeFantasia ?? c.empreendimento.cliente.razaoSocial) : null,
        etapa: c.tipo,
        valor: n(c.valor),
        responsavel: null,
        detalhe: `Vencido há ${diasAtraso} dia(s)`,
        href: c.empreendimento ? `/empreendimentos/${c.empreendimento.id}/financeiro` : "/financeiro",
      };
    });

    return { valorConsolidado, totalRegistros, linhas };
  },
};
