import { prisma } from "@/infra/db/prisma/client";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";

const LABEL_DISC: Record<string, string> = { ELETRICA: "Elétrica", HIDRAULICA: "Hidráulica", MATERIAIS: "Materiais" };

/**
 * "Atrasados" (Engenharia) — pacotes com prazo vencido registrado em
 * EngenhariaControle. Limitação conhecida: não cruza com o status do
 * Levantamento (RASCUNHO/VALIDADO) — em tese um pacote validado logo
 * após o prazo vencer ainda apareceria aqui por alguns instantes.
 * Aceitável dado o volume baixo; revisar se virar ruído na prática.
 */
export const engenhariaAtrasadosHandler: DrilldownHandler = {
  titulo: "Pacotes de Engenharia atrasados",
  definicao: "Pacotes com prazo já vencido, registrados na instrumentação de Engenharia.",
  formatoValor: "numero",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const agora = new Date();

    const where = {
      prazo: { lt: agora, not: null },
      ...(filtros.empreendimentoId && { empreendimentoId: filtros.empreendimentoId }),
    };

    const [totalRegistros, itens] = await Promise.all([
      prisma.engenhariaControle.count({ where }),
      prisma.engenhariaControle.findMany({
        where,
        select: {
          id: true,
          referenciaTipo: true,
          prazo: true,
          empreendimento: { select: { id: true, nome: true } },
          executor: { select: { nome: true } },
        },
        orderBy: { prazo: "asc" },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
    ]);

    const linhas = itens.map((c) => {
      const diasAtraso = c.prazo ? Math.floor((agora.getTime() - c.prazo.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        id: c.id,
        empreendimentoId: c.empreendimento.id,
        empreendimentoNome: c.empreendimento.nome,
        cliente: null,
        etapa: LABEL_DISC[c.referenciaTipo] ?? c.referenciaTipo,
        valor: null,
        responsavel: c.executor?.nome ?? "Não atribuído",
        detalhe: `Atrasado há ${diasAtraso} dia(s)`,
        href: `/empreendimentos/${c.empreendimento.id}`,
      };
    });

    return { valorConsolidado: totalRegistros, totalRegistros, linhas };
  },
};
