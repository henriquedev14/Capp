import { prisma } from "@/infra/db/prisma/client";
import type { StatusOrcamento, StatusAprovacao } from "@/core/orcamentacao/entities/orcamento";

/** Conta dias ÚTEIS entre duas datas (exclui sábado e domingo). */
function diasUteisEntre(inicio: Date, fim: Date): number {
  let dias = 0;
  const atual = new Date(inicio);
  atual.setHours(0, 0, 0, 0);
  const fimSemHora = new Date(fim);
  fimSemHora.setHours(0, 0, 0, 0);

  while (atual < fimSemHora) {
    atual.setDate(atual.getDate() + 1);
    const diaSemana = atual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return Math.max(0, dias);
}

export interface LinhaFilaOrcamento {
  id: string;
  empreendimentoId: string;
  empreendimentoCodigo: string;
  empreendimentoNome: string;
  cidade: string;
  estado: string;
  clienteNome: string;
  revisao: number;
  status: StatusOrcamento;
  statusAprovacao: StatusAprovacao;
  responsavelId: string | null;
  responsavelNome: string | null;
  etapaAtual: string | null;
  etapaStatus: string | null;
  dataPrazo: Date | null;
  diasNaEtapa: number;
  diasAtraso: number;
  totalServicosHgi: number;
  totalMateriais: number;
  totalGeral: number;
  quantidadePendencias: number;
  quantidadeCotacoesPendentes: number;
  ultimaAtualizacao: Date;
  proximaAcao: string;
  bloqueado: boolean;
  motivoBloqueio: string | null;
}

export interface IndicadoresFila {
  emAndamento: number;
  aguardandoLevantamento: number;
  aguardandoCotacao: number;
  aguardandoRevisao: number;
  aguardandoAprovacao: number;
  devolvidos: number;
  atrasados: number;
  valorTotalEmOrcamento: number;
}

export interface FiltrosFilaOrcamento {
  responsavelId?: string;
  status?: StatusOrcamento;
  etapa?: string;
  apenasAtrasados?: boolean;
  apenasAguardandoAprovacao?: boolean;
  apenasComPendencia?: boolean;
  usuarioAtualId?: string;
  visao?: "minha_fila" | "equipe" | "todos" | "atrasados" | "aguardando_aprovacao";
}

function proximaAcaoPara(etapa: string | null, etapaStatus: string | null): string {
  if (!etapa) return "Criar levantamento";
  if (etapaStatus === "BLOQUEADA") return "Resolver bloqueio";
  if (etapaStatus === "DEVOLVIDA") return "Corrigir e reenviar";
  switch (etapa) {
    case "LEVANTAMENTOS":
      return "Validar levantamento";
    case "COMPOSICAO":
      return "Completar composição do serviço";
    case "MATERIAIS":
      return "Precificar materiais pendentes";
    case "COTACOES":
      return "Selecionar cotação";
    case "REVISAO":
      return "Revisar e enviar para aprovação";
    case "APROVACAO":
      return etapaStatus === "APROVADA" ? "Gerar proposta" : "Aguardando aprovação do gestor";
    case "PROPOSTA":
      return "Acompanhar decisão do cliente";
    default:
      return "Verificar próxima etapa";
  }
}

/**
 * Monta a fila de trabalho de Orçamentação: para cada empreendimento, pega
 * a revisão mais recente do orçamento, junta dados de jornada e cotações,
 * calcula indicadores de priorização (bloqueio, atraso, prazo, impacto).
 */
export async function buscarFilaOrcamentos(
  filtros: FiltrosFilaOrcamento = {}
): Promise<{ linhas: LinhaFilaOrcamento[]; indicadores: IndicadoresFila }> {
  const hoje = new Date();

  const orcamentos = await prisma.orcamento.findMany({
    where: { empreendimento: { excluidoEm: null } },
    include: {
      empreendimento: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          cidade: true,
          estado: true,
          cliente: { select: { razaoSocial: true, nomeFantasia: true } },
        },
      },
      responsavel: { select: { nome: true } },
      jornada: true,
      cotacoes: { select: { status: true, createdAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 1 empreendimento = 1 linha, pegando a revisão mais recente
  const porEmp = new Map<string, (typeof orcamentos)[number]>();
  for (const o of orcamentos) {
    const atual = porEmp.get(o.empreendimentoId);
    if (!atual || o.revisao > atual.revisao) porEmp.set(o.empreendimentoId, o);
  }

  const linhas: LinhaFilaOrcamento[] = Array.from(porEmp.values()).map((o) => {
    const etapaEmAndamento = o.jornada.find(
      (j) => j.status === "EM_ANDAMENTO" || j.status === "BLOQUEADA" || j.status === "DEVOLVIDA"
    );
    const etapaAtual = etapaEmAndamento?.etapa ?? o.jornada[o.jornada.length - 1]?.etapa ?? null;
    const etapaStatus = etapaEmAndamento?.status ?? null;

    const diasNaEtapa = etapaEmAndamento?.dataInicio
      ? diasUteisEntre(etapaEmAndamento.dataInicio, hoje)
      : diasUteisEntre(o.createdAt, hoje);

    const diasAtraso = o.dataPrazo && o.dataPrazo < hoje ? diasUteisEntre(o.dataPrazo, hoje) : 0;

    const cotacoesPendentes = o.cotacoes.filter(
      (c) => c.status === "ENVIADA" || c.status === "RASCUNHO"
    ).length;

    const totalServicosHgi = Number(o.totalServicosHgi ?? 0);
    const totalMateriais = Number(o.totalMateriais ?? 0);

    const bloqueado = etapaStatus === "BLOQUEADA";

    return {
      id: o.id,
      empreendimentoId: o.empreendimentoId,
      empreendimentoCodigo: o.empreendimento.codigo,
      empreendimentoNome: o.empreendimento.nome,
      cidade: o.empreendimento.cidade,
      estado: o.empreendimento.estado,
      clienteNome: o.empreendimento.cliente.nomeFantasia ?? o.empreendimento.cliente.razaoSocial,
      revisao: o.revisao,
      status: o.status as StatusOrcamento,
      statusAprovacao: o.statusAprovacao as StatusAprovacao,
      responsavelId: o.responsavelId,
      responsavelNome: o.responsavel?.nome ?? null,
      etapaAtual,
      etapaStatus,
      dataPrazo: o.dataPrazo,
      diasNaEtapa,
      diasAtraso,
      totalServicosHgi,
      totalMateriais,
      totalGeral: totalServicosHgi + totalMateriais,
      quantidadePendencias: cotacoesPendentes,
      quantidadeCotacoesPendentes: cotacoesPendentes,
      ultimaAtualizacao: o.updatedAt,
      proximaAcao: proximaAcaoPara(etapaAtual, etapaStatus),
      bloqueado,
      motivoBloqueio: etapaEmAndamento?.motivoBloqueio ?? null,
    };
  });

  // Filtros
  let filtradas = linhas;

  if (filtros.visao === "minha_fila" && filtros.usuarioAtualId) {
    filtradas = filtradas.filter((l) => l.responsavelId === filtros.usuarioAtualId);
  } else if (filtros.visao === "atrasados") {
    filtradas = filtradas.filter((l) => l.diasAtraso > 0);
  } else if (filtros.visao === "aguardando_aprovacao") {
    filtradas = filtradas.filter((l) => l.statusAprovacao === "AGUARDANDO_APROVACAO");
  }

  if (filtros.responsavelId) {
    filtradas = filtradas.filter((l) => l.responsavelId === filtros.responsavelId);
  }
  if (filtros.status) {
    filtradas = filtradas.filter((l) => l.status === filtros.status);
  }
  if (filtros.etapa) {
    filtradas = filtradas.filter((l) => l.etapaAtual === filtros.etapa);
  }
  if (filtros.apenasAtrasados) {
    filtradas = filtradas.filter((l) => l.diasAtraso > 0);
  }
  if (filtros.apenasAguardandoAprovacao) {
    filtradas = filtradas.filter((l) => l.statusAprovacao === "AGUARDANDO_APROVACAO");
  }
  if (filtros.apenasComPendencia) {
    filtradas = filtradas.filter((l) => l.quantidadePendencias > 0);
  }

  // Ordenação por prioridade: bloqueados → atrasados → prazo próximo →
  // maior impacto financeiro → tempo sem atualização
  filtradas.sort((a, b) => {
    if (a.bloqueado !== b.bloqueado) return a.bloqueado ? -1 : 1;
    if (a.diasAtraso !== b.diasAtraso) return b.diasAtraso - a.diasAtraso;
    const prazoA = a.dataPrazo?.getTime() ?? Infinity;
    const prazoB = b.dataPrazo?.getTime() ?? Infinity;
    if (prazoA !== prazoB) return prazoA - prazoB;
    if (a.totalGeral !== b.totalGeral) return b.totalGeral - a.totalGeral;
    return b.diasNaEtapa - a.diasNaEtapa;
  });

  // Indicadores calculados sobre o conjunto TOTAL (não filtrado), pra
  // sempre refletir a visão geral independente do filtro aplicado na lista
  const indicadores: IndicadoresFila = {
    emAndamento: linhas.filter((l) => l.status === "EM_LEVANTAMENTO").length,
    aguardandoLevantamento: linhas.filter((l) => l.etapaAtual === "LEVANTAMENTOS").length,
    aguardandoCotacao: linhas.filter((l) => l.etapaAtual === "COTACOES").length,
    aguardandoRevisao: linhas.filter((l) => l.etapaAtual === "REVISAO").length,
    aguardandoAprovacao: linhas.filter((l) => l.statusAprovacao === "AGUARDANDO_APROVACAO").length,
    devolvidos: linhas.filter((l) => l.status === "ORCAMENTO_DEVOLVIDO").length,
    atrasados: linhas.filter((l) => l.diasAtraso > 0).length,
    valorTotalEmOrcamento: linhas.reduce((acc, l) => acc + l.totalGeral, 0),
  };

  return { linhas: filtradas, indicadores };
}
