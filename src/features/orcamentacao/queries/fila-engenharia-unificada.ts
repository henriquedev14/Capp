import { prisma } from "@/infra/db/prisma/client";
import { calcularJornadaReal } from "@/core/orcamentacao/use-cases/calcular-jornada-real";
import { calcularProgressoLevantamento } from "@/core/orcamentacao/use-cases/calcular-progresso-levantamento";
import type { EtapaJornada, StatusEtapaJornada } from "@/core/orcamentacao/entities/orcamento";

const ORDEM_ETAPAS: EtapaJornada[] = [
  "LEVANTAMENTOS",
  "COMPOSICAO",
  "MATERIAIS",
  "COTACOES",
  "REVISAO",
  "APROVACAO",
  "PROPOSTA",
];

export type BadgeCategoria = "neutro" | "azul" | "laranja" | "roxo" | "verde" | "vermelho";
export type Prioridade = "normal" | "atencao" | "critica";

export interface LinhaEngenharia {
  empreendimentoId: string;
  empreendimentoCodigo: string;
  empreendimentoNome: string;
  clienteNome: string;
  cidade: string;
  estado: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  temOrcamento: boolean;
  etapaAtual: EtapaJornada | null;
  etapaStatus: StatusEtapaJornada | null;
  etapaLabel: string;
  levantamentoLabel: string;
  // Índice da etapa atual (0-6) pra desenhar os 7 segmentos do progresso.
  progressoIndice: number;
  statusBadgeTexto: string;
  statusBadgeCategoria: BadgeCategoria;
  proximaAcaoLabel: string;
  proximaAcaoDetalhe: string | null;
  proximaAcaoAcionavel: boolean;
  pendencias: string[];
  diasSemAtualizacao: number;
  atrasado: boolean;
  prioridade: Prioridade;
}

const LABEL_ETAPA: Record<EtapaJornada, string> = {
  LEVANTAMENTOS: "Levantamento",
  COMPOSICAO: "Composição",
  MATERIAIS: "Materiais",
  COTACOES: "Cotações",
  REVISAO: "Revisão",
  APROVACAO: "Aprovação",
  PROPOSTA: "Proposta",
};

/**
 * Fila UNIFICADA de Engenharia — empreendimento-centrada (não parte de
 * Orçamentos existentes, pra nunca "sumir" um item que já tem
 * responsável mas ainda não tem Orçamento criado). Cada linha calcula
 * a jornada REAL via calcularJornadaReal + o progresso granular do
 * levantamento (calcularProgressoLevantamento) — nada de "tudo ou
 * nada". Redesenho completo em 10/08/2026 (v4 — referência visual
 * enviada pelo Henrique, estilo Linear/Monday).
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
      codigo: true,
      nome: true,
      cidade: true,
      estado: true,
      kitEletrico: true,
      kitHidraulico: true,
      responsavelOrcamentacaoUserId: true,
      responsavelOrcamentacaoUser: { select: { nome: true } },
      updatedAt: true,
      cliente: { select: { razaoSocial: true, nomeFantasia: true } },
      tipologias: {
        select: {
          nome: true,
          levantamentos: { select: { status: true } },
          levantamentosMateriais: { select: { status: true } },
          levantamentosHidraulicos: { select: { status: true } },
        },
      },
      orcamentos: {
        orderBy: { revisao: "desc" },
        take: 1,
        select: {
          status: true,
          statusAprovacao: true,
          totalServicosHgi: true,
          propostaGeradaEm: true,
          motivoDevolucao: true,
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

    const progresso = calcularProgressoLevantamento(
      e.tipologias.map((t) => ({
        nome: t.nome,
        temLevantamentoEletricoValidado: t.levantamentos.some((l) => l.status === "VALIDADO"),
        temLevantamentoMateriaisValidado: t.levantamentosMateriais.some((l) => l.status === "VALIDADO"),
        temLevantamentoHidraulicoValidado: t.levantamentosHidraulicos.some((l) => l.status === "VALIDADO"),
      })),
      e.kitEletrico,
      e.kitHidraulico
    );

    const pendencias = montarPendencias(progresso);
    const levantamentoLabel = montarLevantamentoLabel(progresso);

    if (!orcamento) {
      const diasSemAtualizacao = Math.floor((Date.now() - e.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      const atrasado = diasSemAtualizacao > 5;

      // Achado pelo Henrique em 11/08/2026: aqui era hardcoded "Não
      // iniciado"/"Iniciar levantamento" sempre que não existia
      // Orçamento ainda — mesmo quando o levantamento já estava 100%
      // pronto (só faltava criar o Orçamento, um passo separado). Usa
      // o progresso REAL igual o resto do sistema.
      let statusBadgeTexto: string;
      let statusBadgeCategoria: "neutro" | "azul" | "verde";
      let proximaAcaoLabel: string;
      if (!e.responsavelOrcamentacaoUserId) {
        statusBadgeTexto = "Não iniciado";
        statusBadgeCategoria = "neutro";
        proximaAcaoLabel = "Aguardando responsável";
      } else if (progresso.completo) {
        statusBadgeTexto = "Levantamento completo";
        statusBadgeCategoria = "verde";
        proximaAcaoLabel = "Criar orçamento";
      } else if (progresso.naoIniciado) {
        statusBadgeTexto = "Não iniciado";
        statusBadgeCategoria = "neutro";
        proximaAcaoLabel = "Iniciar levantamento";
      } else {
        statusBadgeTexto = "Em andamento";
        statusBadgeCategoria = "azul";
        proximaAcaoLabel = "Continuar levantamento";
      }

      linhas.push({
        empreendimentoId: e.id,
        empreendimentoCodigo: e.codigo,
        empreendimentoNome: e.nome,
        clienteNome,
        cidade: e.cidade ?? "",
        estado: e.estado ?? "",
        responsavelId: e.responsavelOrcamentacaoUserId,
        responsavelNome,
        temOrcamento: false,
        etapaAtual: null,
        etapaStatus: null,
        etapaLabel: "Levantamento",
        levantamentoLabel,
        progressoIndice: 0,
        statusBadgeTexto,
        statusBadgeCategoria,
        proximaAcaoLabel,
        proximaAcaoDetalhe: null,
        proximaAcaoAcionavel: !!e.responsavelOrcamentacaoUserId,
        pendencias,
        diasSemAtualizacao,
        atrasado,
        prioridade: atrasado ? "critica" : diasSemAtualizacao >= 3 ? "atencao" : "normal",
      });
      continue;
    }

    const jornadaReal = calcularJornadaReal({
      jornadaExistente: orcamento.jornada as never,
      levantamentosOk: progresso.completo,
      totalServicosHgi: Number(orcamento.totalServicosHgi ?? 0),
      totalItensMaterial: orcamento.itensMaterial.length,
      cotacoes: orcamento.cotacoes,
      statusOrcamento: orcamento.status as never,
      propostaGeradaEm: orcamento.propostaGeradaEm ? orcamento.propostaGeradaEm.toISOString() : null,
    });

    const etapaEmAndamento = jornadaReal.find(
      (j) => j.status === "EM_ANDAMENTO" || j.status === "BLOQUEADA" || j.status === "DEVOLVIDA"
    );
    const etapaAtual = etapaEmAndamento?.etapa ?? jornadaReal[jornadaReal.length - 1]?.etapa ?? "LEVANTAMENTOS";
    const etapaStatus = etapaEmAndamento?.status ?? jornadaReal[jornadaReal.length - 1]?.status ?? null;
    const progressoIndice = Math.max(0, ORDEM_ETAPAS.indexOf(etapaAtual));

    const diasSemAtualizacao = Math.floor((Date.now() - orcamento.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const atrasado = etapaStatus === "BLOQUEADA" || diasSemAtualizacao > 7;

    const { texto: statusBadgeTexto, categoria: statusBadgeCategoria } = montarBadge(etapaAtual, etapaStatus);
    const { label: proximaAcaoLabel, detalhe: proximaAcaoDetalhe, acionavel: proximaAcaoAcionavel } =
      montarProximaAcao(etapaAtual, etapaStatus, progresso, e.responsavelOrcamentacaoUserId);

    linhas.push({
      empreendimentoId: e.id,
      empreendimentoCodigo: e.codigo,
      empreendimentoNome: e.nome,
      clienteNome,
      cidade: e.cidade ?? "",
      estado: e.estado ?? "",
      responsavelId: e.responsavelOrcamentacaoUserId,
      responsavelNome,
      temOrcamento: true,
      etapaAtual,
      etapaStatus,
      etapaLabel: LABEL_ETAPA[etapaAtual],
      levantamentoLabel,
      progressoIndice,
      statusBadgeTexto,
      statusBadgeCategoria,
      proximaAcaoLabel,
      proximaAcaoDetalhe,
      proximaAcaoAcionavel,
      pendencias,
      diasSemAtualizacao,
      atrasado,
      prioridade: atrasado ? "critica" : diasSemAtualizacao >= 4 ? "atencao" : "normal",
    });
  }

  return linhas;
}

function montarLevantamentoLabel(progresso: ReturnType<typeof calcularProgressoLevantamento>): string {
  if (progresso.completo) return "Levantamento completo";
  if (progresso.naoIniciado) return "Levantamento não iniciado";
  const partes: string[] = [];
  if (progresso.eletricoTotal > 0) partes.push(`Elétrico ${progresso.eletricoValidados}/${progresso.eletricoTotal}`);
  if (progresso.materiaisTotal > 0) partes.push(`Materiais ${progresso.materiaisValidados}/${progresso.materiaisTotal}`);
  if (progresso.hidraulicoTotal > 0) partes.push(`Hidráulico ${progresso.hidraulicoValidados}/${progresso.hidraulicoTotal}`);
  return partes.join(" · ");
}

function montarPendencias(progresso: ReturnType<typeof calcularProgressoLevantamento>): string[] {
  const pendencias: string[] = [];
  if (progresso.eletricoTotal > 0 && progresso.eletricoValidados < progresso.eletricoTotal) {
    pendencias.push(
      `${progresso.eletricoTotal - progresso.eletricoValidados} tipologia(s) sem levantamento elétrico validado`
    );
  }
  if (progresso.materiaisTotal > 0 && progresso.materiaisValidados < progresso.materiaisTotal) {
    pendencias.push(
      `${progresso.materiaisTotal - progresso.materiaisValidados} tipologia(s) sem levantamento de materiais validado`
    );
  }
  if (progresso.hidraulicoTotal > 0 && progresso.hidraulicoValidados < progresso.hidraulicoTotal) {
    pendencias.push(
      `${progresso.hidraulicoTotal - progresso.hidraulicoValidados} tipologia(s) sem levantamento hidráulico validado`
    );
  }
  return pendencias;
}

function montarBadge(
  etapa: EtapaJornada,
  status: StatusEtapaJornada | null
): { texto: string; categoria: BadgeCategoria } {
  if (status === "BLOQUEADA") return { texto: "Bloqueada", categoria: "vermelho" };
  if (status === "DEVOLVIDA") return { texto: "Em revisão", categoria: "roxo" };
  if (etapa === "APROVACAO" && status === "EM_ANDAMENTO") return { texto: "Aguardando aprovação", categoria: "laranja" };
  if (status === "APROVADA") return { texto: "Aprovado", categoria: "verde" };
  if (status === "EM_ANDAMENTO") return { texto: "Em andamento", categoria: "azul" };
  return { texto: "Não iniciado", categoria: "neutro" };
}

function montarProximaAcao(
  etapa: EtapaJornada,
  status: StatusEtapaJornada | null,
  progresso: ReturnType<typeof calcularProgressoLevantamento>,
  responsavelId: string | null
): { label: string; detalhe: string | null; acionavel: boolean } {
  if (!responsavelId) return { label: "Aguardando responsável", detalhe: null, acionavel: false };

  if (etapa === "LEVANTAMENTOS") {
    if (status === "BLOQUEADA") return { label: "Corrigir levantamento", detalhe: null, acionavel: true };
    if (progresso.naoIniciado) return { label: "Iniciar levantamento", detalhe: null, acionavel: true };
    const total = progresso.eletricoTotal || progresso.hidraulicoTotal;
    const feitos = progresso.eletricoValidados || progresso.hidraulicoValidados;
    return {
      label: "Continuar levantamento",
      detalhe: total > 0 ? `${feitos} de ${total} tipologia(s) analisadas` : null,
      acionavel: true,
    };
  }
  if (etapa === "COMPOSICAO") return { label: "Compor orçamento", detalhe: null, acionavel: true };
  if (etapa === "MATERIAIS") return { label: "Lançar materiais", detalhe: null, acionavel: true };
  if (etapa === "COTACOES") return { label: "Enviar pra cotação", detalhe: null, acionavel: true };
  if (etapa === "REVISAO" && status === "DEVOLVIDA") return { label: "Corrigir e reenviar", detalhe: null, acionavel: true };
  if (etapa === "REVISAO") return { label: "Enviar para aprovação", detalhe: null, acionavel: true };
  if (etapa === "APROVACAO") return { label: "Aguardando gestor", detalhe: null, acionavel: false };
  if (etapa === "PROPOSTA") return { label: "Gerar proposta", detalhe: null, acionavel: true };
  return { label: "—", detalhe: null, acionavel: false };
}
