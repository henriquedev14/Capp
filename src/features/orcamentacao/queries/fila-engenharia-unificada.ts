import { prisma } from "@/infra/db/prisma/client";
import { verificarGateOrcamentacao } from "@/features/empreendimentos/lib/gates-status";
import { calcularJornadaReal } from "@/core/orcamentacao/use-cases/calcular-jornada-real";
import type { EtapaJornada, StatusEtapaJornada } from "@/core/orcamentacao/entities/orcamento";

export interface LinhaEngenharia {
  empreendimentoId: string;
  empreendimentoNome: string;
  clienteNome: string;
  cidade: string;
  estado: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  temOrcamento: boolean;
  etapaAtual: EtapaJornada | null;
  etapaStatus: StatusEtapaJornada | null;
  diasSemAtualizacao: number;
  atrasado: boolean;
}

/**
 * Fila UNIFICADA de Engenharia — empreendimento-centrada (não parte de
 * Orçamentos existentes), pra nunca "sumir" um item que já tem
 * responsável mas ainda não tem Orçamento criado. Cada linha calcula
 * a jornada REAL via calcularJornadaReal (baseada em dado de verdade,
 * não numa tabela que só é atualizada manualmente). Redesenho de
 * 10/08/2026, depois do Henrique flagar o sumiço e a imprecisão do
 * indicador visual antigo.
 */
export async function buscarFilaEngenhariaUnificada(responsavelComercialUserId?: string): Promise<LinhaEngenharia[]> {
  const empreendimentos = await prisma.empreendimento.findMany({
    where: {
      status: "ORCAMENTACAO",
      excluidoEm: null,
      ...(responsavelComercialUserId && { responsavelComercialUserId }),
    },
    select: {
      id: true,
      nome: true,
      cidade: true,
      estado: true,
      kitEletrico: true,
      kitHidraulico: true,
      responsavelOrcamentacaoUserId: true,
      responsavelOrcamentacaoUser: { select: { nome: true } },
      updatedAt: true,
      cliente: { select: { razaoSocial: true, nomeFantasia: true } },
      orcamentos: {
        orderBy: { revisao: "desc" },
        take: 1,
        select: {
          status: true,
          totalServicosHgi: true,
          propostaGeradaEm: true,
          updatedAt: true,
          itensMaterial: { select: { id: true } },
          cotacoes: { select: { status: true } },
          jornada: true,
        },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  const linhas: LinhaEngenharia[] = [];

  for (const e of empreendimentos) {
    const orcamento = e.orcamentos[0];
    const clienteNome = e.cliente.nomeFantasia ?? e.cliente.razaoSocial;
    const responsavelNome = e.responsavelOrcamentacaoUser?.nome ?? null;

    if (!orcamento) {
      const diasSemAtualizacao = Math.floor((Date.now() - e.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      linhas.push({
        empreendimentoId: e.id,
        empreendimentoNome: e.nome,
        clienteNome,
        cidade: e.cidade ?? "",
        estado: e.estado ?? "",
        responsavelId: e.responsavelOrcamentacaoUserId,
        responsavelNome,
        temOrcamento: false,
        etapaAtual: null,
        etapaStatus: null,
        diasSemAtualizacao,
        atrasado: diasSemAtualizacao > 5,
      });
      continue;
    }

    const gate = await verificarGateOrcamentacao(e.id, e.kitEletrico, e.kitHidraulico);
    const jornadaReal = calcularJornadaReal({
      jornadaExistente: orcamento.jornada as never,
      levantamentosOk: "ok" in gate,
      totalServicosHgi: Number(orcamento.totalServicosHgi ?? 0),
      totalItensMaterial: orcamento.itensMaterial.length,
      cotacoes: orcamento.cotacoes,
      statusOrcamento: orcamento.status as never,
      propostaGeradaEm: orcamento.propostaGeradaEm ? orcamento.propostaGeradaEm.toISOString() : null,
    });

    const etapaEmAndamento = jornadaReal.find(
      (j) => j.status === "EM_ANDAMENTO" || j.status === "BLOQUEADA" || j.status === "DEVOLVIDA"
    );
    const etapaAtual = etapaEmAndamento?.etapa ?? jornadaReal[jornadaReal.length - 1]?.etapa ?? null;
    const etapaStatus = etapaEmAndamento?.status ?? jornadaReal[jornadaReal.length - 1]?.status ?? null;

    const diasSemAtualizacao = Math.floor((Date.now() - orcamento.updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    linhas.push({
      empreendimentoId: e.id,
      empreendimentoNome: e.nome,
      clienteNome,
      cidade: e.cidade ?? "",
      estado: e.estado ?? "",
      responsavelId: e.responsavelOrcamentacaoUserId,
      responsavelNome,
      temOrcamento: true,
      etapaAtual,
      etapaStatus,
      diasSemAtualizacao,
      atrasado: etapaStatus === "BLOQUEADA" || diasSemAtualizacao > 7,
    });
  }

  return linhas;
}
