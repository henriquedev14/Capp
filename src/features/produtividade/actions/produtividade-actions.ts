"use server";

import { prisma } from "@/infra/db/prisma/client";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { PessoaProdutividade } from "@/core/produtividade/use-cases/classificar-quadrante";
import { carregarDashboardData } from "@/features/dashboard/lib/queries";
import { calcularProdutividadePorOperador } from "@/features/producao/actions/producao-actions";

/**
 * Busca os dados de "Saúde Geral" (semáforo por área) e "Tempo Médio de
 * Ciclo" — reaproveitando o que o Painel principal já calcula
 * (kpisCronologicos, paradosSemAtualizacao, cotacoesSemResposta), só
 * que reorganizado pra tela de Produtividade. Não duplica lógica, só
 * consome o mesmo dado de outro jeito. Pedido pelo Henrique em
 * 06/08/2026, depois de achar a tela "simples demais" sem isso.
 */
export async function buscarSaudeGeralEEngenharia(inicio: Date, fim: Date) {
  const [dashboard, produtividadeProducao] = await Promise.all([
    carregarDashboardData(),
    calcularProdutividadePorOperador(inicio, fim),
  ]);

  const orcamentosParados = dashboard.paradosSemAtualizacao.length + dashboard.empreendimentosParadosSemOrcamento.length;
  const cotacoesParadas = dashboard.cotacoesSemResposta.length;

  const metaPorOperador = new Map<string, number>();
  for (const p of produtividadeProducao) {
    metaPorOperador.set(p.operadorId, Math.max(metaPorOperador.get(p.operadorId) ?? 0, p.metaPeriodoUH));
  }
  const metaTotal = Array.from(metaPorOperador.values()).reduce((s, v) => s + v, 0);
  const realizadoTotal = produtividadeProducao.reduce((s, p) => s + p.quantidadeUH, 0);
  const percentualProducao = metaTotal > 0 ? Math.round((realizadoTotal / metaTotal) * 100) : 0;

  return {
    kpisCronologicos: dashboard.kpisCronologicos,
    orcamentosParados,
    cotacoesParadas,
    percentualProducao,
    realizadoTotal: Math.round(realizadoTotal),
    metaTotal: Math.round(metaTotal),
    engenhariaPerformance: dashboard.analytics.engenharia,
  };
}

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Busca os dados brutos de volume por pessoa, para os papéis
 * cobertos aqui (Comercial e Orçamentista). Engenharia saiu deste quadrante
 * porque agora usa produtividade ponderada por complexidade/disciplinas; Produção tem
 * tela própria (calcularProdutividadePorOperador), não entra aqui.
 *
 * "Na mão" = carga ativa agora. "Parado" = sem atualização há mais de
 * 7 dias. "Produziu" = concluído dentro do período informado.
 */
export async function buscarProdutividadePorPessoa(
  inicioPeriodo: Date,
  fimPeriodo: Date
): Promise<PessoaProdutividade[]> {
  const seteDiasAtras = new Date(Date.now() - SETE_DIAS_MS);
  const resultado: PessoaProdutividade[] = [];

  // ---------- Comercial ----------
  const empreendimentosAtivos = await prisma.empreendimento.findMany({
    where: {
      excluidoEm: null,
      status: { notIn: ["CONCLUIDO", "ARQUIVADO"] },
      responsavelComercialUserId: { not: null },
    },
    select: {
      responsavelComercialUserId: true,
      responsavelComercialUser: { select: { nome: true } },
      updatedAt: true,
    },
  });
  const fechadosNoPeriodo = await prisma.empreendimento.groupBy({
    by: ["responsavelComercialUserId"],
    where: {
      responsavelComercialUserId: { not: null },
      status: { notIn: ["PROSPECCAO", "COMERCIAL", "ORCAMENTACAO", "NEGOCIACAO"] },
      updatedAt: { gte: inicioPeriodo, lte: fimPeriodo },
    },
    _count: true,
  });
  const fechadosPorUsuario = new Map(fechadosNoPeriodo.map((f) => [f.responsavelComercialUserId, f._count]));

  const comercialPorUsuario = new Map<string, { nome: string; carga: number; parados: number }>();
  for (const e of empreendimentosAtivos) {
    const id = e.responsavelComercialUserId!;
    const atual = comercialPorUsuario.get(id) ?? { nome: e.responsavelComercialUser!.nome, carga: 0, parados: 0 };
    atual.carga++;
    if (e.updatedAt < seteDiasAtras) atual.parados++;
    comercialPorUsuario.set(id, atual);
  }
  for (const [id, dados] of comercialPorUsuario) {
    resultado.push({
      usuarioId: id,
      nome: dados.nome,
      papel: "COMERCIAL",
      cargaAtual: dados.carga,
      itensParados: dados.parados,
      produzidoNoPeriodo: fechadosPorUsuario.get(id) ?? 0,
    });
  }

  // Engenharia saiu deste quadrante genérico: quantidade bruta de levantamentos
  // não é uma métrica justa entre disciplinas/complexidades. A visão ponderada
  // vive em dashboard.analytics.engenharia / EngenhariaPerformance.

  // ---------- Orçamentista ----------
  const orcamentosAbertos = await prisma.orcamento.findMany({
    where: { status: { notIn: ["ORCAMENTO_APROVADO"] }, responsavelId: { not: null } },
    select: { responsavelId: true, responsavel: { select: { nome: true } }, updatedAt: true },
  });
  const aprovadosNoPeriodo = await prisma.orcamento.groupBy({
    by: ["responsavelId"],
    where: {
      responsavelId: { not: null },
      status: "ORCAMENTO_APROVADO",
      updatedAt: { gte: inicioPeriodo, lte: fimPeriodo },
    },
    _count: true,
  });
  const aprovadosPorUsuario = new Map(aprovadosNoPeriodo.map((a) => [a.responsavelId, a._count]));

  const orcamentistaPorUsuario = new Map<string, { nome: string; carga: number; parados: number }>();
  for (const o of orcamentosAbertos) {
    const id = o.responsavelId!;
    const atual = orcamentistaPorUsuario.get(id) ?? { nome: o.responsavel!.nome, carga: 0, parados: 0 };
    atual.carga++;
    if (o.updatedAt < seteDiasAtras) atual.parados++;
    orcamentistaPorUsuario.set(id, atual);
  }
  for (const [id, dados] of orcamentistaPorUsuario) {
    resultado.push({
      usuarioId: id,
      nome: dados.nome,
      papel: "ORCAMENTISTA",
      cargaAtual: dados.carga,
      itensParados: dados.parados,
      produzidoNoPeriodo: aprovadosPorUsuario.get(id) ?? 0,
    });
  }

  return resultado;
}

/**
 * Verifica se a pessoa logada pode ver a Central de Produtividade —
 * pedido do Henrique em 05/08/2026: CEO (Admin) e Coordenador.
 */
export async function podeVerProdutividade(): Promise<boolean> {
  return temPermissao(PERMISSOES.DASHBOARD_VER_PRODUTIVIDADE);
}
