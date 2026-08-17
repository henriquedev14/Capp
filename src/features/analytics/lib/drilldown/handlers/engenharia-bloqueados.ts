import { prisma } from "@/infra/db/prisma/client";
import type { DrilldownHandler, DrilldownFiltros } from "@/features/analytics/lib/drilldown/types";

const LABEL_DISC: Record<string, string> = { ELETRICA: "Elétrica", HIDRAULICA: "Hidráulica", MATERIAIS: "Materiais" };

/**
 * "Bloqueados" (Engenharia) — pacotes com bloqueadoEm preenchido,
 * mostrando o motivo objetivo (não só a palavra "Bloqueado"). Pedido
 * pelo Henrique em 14/08/2026: "O Coordenador precisa saber por que
 * está parado."
 *
 * `empreendimentoId` é campo solto (sem @relation nomeada no schema),
 * então o empreendimento é buscado numa segunda query e unido em
 * memória.
 */
export const engenhariaBloqueadosHandler: DrilldownHandler = {
  titulo: "Pacotes de Engenharia bloqueados",
  definicao: "Pacotes com bloqueio explícito registrado, com motivo.",
  formatoValor: "numero",
  async buscar(filtros: DrilldownFiltros, pagina, tamanhoPagina) {
    const agora = new Date();

    const where = {
      bloqueadoEm: { not: null },
      ...(filtros.empreendimentoId && { empreendimentoId: filtros.empreendimentoId }),
    };

    const [totalRegistros, itens] = await Promise.all([
      prisma.engenhariaControle.count({ where }),
      prisma.engenhariaControle.findMany({
        where,
        select: {
          id: true,
          referenciaTipo: true,
          bloqueadoEm: true,
          motivoBloqueio: true,
          empreendimentoId: true,
          executor: { select: { nome: true } },
        },
        orderBy: { bloqueadoEm: "asc" },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
    ]);

    const empreendimentos = await prisma.empreendimento.findMany({
      where: { id: { in: itens.map((i) => i.empreendimentoId) } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(empreendimentos.map((e) => [e.id, e.nome]));

    const linhas = itens.map((c) => {
      const diasBloqueado = c.bloqueadoEm ? Math.floor((agora.getTime() - c.bloqueadoEm.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        id: c.id,
        empreendimentoId: c.empreendimentoId,
        empreendimentoNome: nomePorId.get(c.empreendimentoId) ?? "—",
        cliente: null,
        etapa: LABEL_DISC[c.referenciaTipo] ?? c.referenciaTipo,
        valor: null,
        responsavel: c.executor?.nome ?? "Não atribuído",
        detalhe: `Bloqueado há ${diasBloqueado}d · ${c.motivoBloqueio ?? "motivo não informado"}`,
        href: `/empreendimentos/${c.empreendimentoId}`,
      };
    });

    return { valorConsolidado: totalRegistros, totalRegistros, linhas };
  },
};
