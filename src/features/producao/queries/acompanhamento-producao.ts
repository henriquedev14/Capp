import { prisma } from "@/infra/db/prisma/client";
import { contarKitsFinalizados, type KitsFinalizados } from "@/features/producao/actions/producao-actions";

export interface PontoTendencia {
  data: string;
  quantidade: number;
  meta: number;
}

export interface LinhaComparativoEmpreendimento {
  empreendimentoId: string;
  empreendimentoNome: string;
  kitsFinalizados: number;
}

export interface AcompanhamentoProducao {
  hoje: KitsFinalizados;
  tendencia7dias: PontoTendencia[];
  comparativoEmpreendimentos: LinhaComparativoEmpreendimento[];
}

/**
 * Dados reais pra tela de acompanhamento de Produção no tablet —
 * velocímetro (hoje vs meta), tendência dos últimos 7 dias, e
 * comparativo de kits finalizados por empreendimento (não por torre —
 * Tipologia não tem relação direta com Torre no schema atual, então
 * comparar por empreendimento é o que dá pra fazer com segurança sem
 * inventar uma relação nova). Construído em 10/08/2026 a pedido do
 * Henrique, levando a demo estática (v6) pra dado real.
 */
export async function buscarAcompanhamentoProducao(): Promise<AcompanhamentoProducao> {
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const hojeFim = new Date(hojeInicio);
  hojeFim.setDate(hojeFim.getDate() + 1);

  const hoje = await contarKitsFinalizados(hojeInicio, hojeFim);

  const tendencia7dias: PontoTendencia[] = [];
  for (let i = 6; i >= 0; i--) {
    const inicio = new Date(hojeInicio);
    inicio.setDate(inicio.getDate() - i);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);
    const resultado = await contarKitsFinalizados(inicio, fim);
    tendencia7dias.push({
      data: inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      quantidade: resultado.quantidade,
      meta: resultado.meta,
    });
  }

  const bancadaFinalizacao = await prisma.bancada.findUnique({ where: { nome: "Finalização" } });
  let comparativoEmpreendimentos: LinhaComparativoEmpreendimento[] = [];
  if (bancadaFinalizacao) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const agrupado = await prisma.registroProducao.groupBy({
      by: ["empreendimentoId"],
      where: { bancadaId: bancadaFinalizacao.id, createdAt: { gte: inicioMes } },
      _sum: { unidadesConcluidas: true },
    });

    const empreendimentos = await prisma.empreendimento.findMany({
      where: { id: { in: agrupado.map((a) => a.empreendimentoId) } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(empreendimentos.map((e) => [e.id, e.nome]));

    comparativoEmpreendimentos = agrupado
      .map((a) => ({
        empreendimentoId: a.empreendimentoId,
        empreendimentoNome: nomePorId.get(a.empreendimentoId) ?? "—",
        kitsFinalizados: a._sum.unidadesConcluidas ?? 0,
      }))
      .sort((a, b) => b.kitsFinalizados - a.kitsFinalizados)
      .slice(0, 8);
  }

  return { hoje, tendencia7dias, comparativoEmpreendimentos };
}
