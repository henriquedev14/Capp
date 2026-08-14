import { prisma } from "@/infra/db/prisma/client";
import type { Prisma } from "@/generated/prisma";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";

function n(v: unknown): number {
  return v == null ? 0 : Number(v);
}

/**
 * "Pedidos atrasados" — Pedido de Compra ainda aberto (não entregue
 * nem cancelado) com dataPrevistaEntrega no passado. Mesma lógica de
 * queries.ts (pedidosAtrasados).
 */
export const pedidosAtrasadosHandler: DrilldownHandler = {
  titulo: "Pedidos de compra atrasados",
  definicao: "Pedidos ainda abertos (não entregues, não cancelados) com prazo de entrega já vencido.",
  formatoValor: "numero",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const agora = new Date();

    const where: Prisma.PedidoCompraWhereInput = {
      status: { notIn: ["ENTREGUE_COMPLETO", "CANCELADO"] },
      dataPrevistaEntrega: { lt: agora, not: null },
      ...(filtros.empreendimentoId && { empreendimentoId: filtros.empreendimentoId }),
    };

    const [totalRegistros, itens] = await Promise.all([
      prisma.pedidoCompra.count({ where }),
      prisma.pedidoCompra.findMany({
        where,
        select: {
          id: true,
          numero: true,
          dataPrevistaEntrega: true,
          empreendimento: { select: { id: true, nome: true } },
          fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
          itens: { select: { quantidadePedida: true, precoUnitario: true } },
        },
        orderBy: { dataPrevistaEntrega: "asc" },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
    ]);

    let valorConsolidado = 0;
    const linhas = itens.map((p) => {
      const valor = p.itens.reduce((s, i) => s + n(i.quantidadePedida) * n(i.precoUnitario), 0);
      valorConsolidado += valor;
      const diasAtraso = Math.floor((agora.getTime() - p.dataPrevistaEntrega!.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: p.id,
        empreendimentoId: p.empreendimento.id,
        empreendimentoNome: p.empreendimento.nome,
        cliente: p.fornecedor.nomeFantasia ?? p.fornecedor.razaoSocial,
        etapa: null,
        valor,
        responsavel: null,
        detalhe: `${p.numero} · atrasado há ${diasAtraso} dia(s)`,
        href: `/empreendimentos/${p.empreendimento.id}`,
      };
    });

    return { valorConsolidado, totalRegistros, linhas };
  },
};
