"use server";

import { prisma } from "@/infra/db/prisma/client";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { PessoaProdutividade } from "@/core/produtividade/use-cases/classificar-quadrante";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Busca os dados brutos de produtividade por pessoa, pros 3 papéis
 * cobertos hoje (Comercial, Engenharia, Orçamentista) — Produção já tem
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

  // ---------- Engenharia (Levantamentos) ----------
  const [eletricosRascunho, hidraulicosRascunho, materiaisRascunho] = await Promise.all([
    prisma.levantamentoEletrico.findMany({
      where: { status: "RASCUNHO", criadoPorId: { not: null } },
      select: { criadoPorId: true, criadoPor: { select: { nome: true } }, updatedAt: true },
    }),
    prisma.levantamentoHidraulico.findMany({
      where: { status: "RASCUNHO", criadoPorId: { not: null } },
      select: { criadoPorId: true, criadoPor: { select: { nome: true } }, updatedAt: true },
    }),
    prisma.levantamentoMateriais.findMany({
      where: { status: "RASCUNHO", criadoPorId: { not: null } },
      select: { criadoPorId: true, criadoPor: { select: { nome: true } }, updatedAt: true },
    }),
  ]);
  const [eletricosValidados, hidraulicosValidados, materiaisValidados] = await Promise.all([
    prisma.levantamentoEletrico.groupBy({
      by: ["validadoPorId"],
      where: { validadoPorId: { not: null }, validadoEm: { gte: inicioPeriodo, lte: fimPeriodo } },
      _count: true,
    }),
    prisma.levantamentoHidraulico.groupBy({
      by: ["validadoPorId"],
      where: { validadoPorId: { not: null }, validadoEm: { gte: inicioPeriodo, lte: fimPeriodo } },
      _count: true,
    }),
    prisma.levantamentoMateriais.groupBy({
      by: ["validadoPorId"],
      where: { validadoPorId: { not: null }, validadoEm: { gte: inicioPeriodo, lte: fimPeriodo } },
      _count: true,
    }),
  ]);

  const engenhariaPorUsuario = new Map<string, { nome: string; carga: number; parados: number }>();
  for (const lev of [...eletricosRascunho, ...hidraulicosRascunho, ...materiaisRascunho]) {
    const id = lev.criadoPorId!;
    const atual = engenhariaPorUsuario.get(id) ?? { nome: lev.criadoPor!.nome, carga: 0, parados: 0 };
    atual.carga++;
    if (lev.updatedAt < seteDiasAtras) atual.parados++;
    engenhariaPorUsuario.set(id, atual);
  }
  const validadosPorUsuario = new Map<string, number>();
  for (const grupo of [...eletricosValidados, ...hidraulicosValidados, ...materiaisValidados]) {
    const id = grupo.validadoPorId!;
    validadosPorUsuario.set(id, (validadosPorUsuario.get(id) ?? 0) + grupo._count);
  }
  // Alguém pode ter validado no período sem ter nada em rascunho hoje —
  // garante que essa pessoa também apareça, só sem carga/parado.
  for (const id of validadosPorUsuario.keys()) {
    if (!engenhariaPorUsuario.has(id)) {
      const usuario = await prisma.usuario.findUnique({ where: { id }, select: { nome: true } });
      if (usuario) engenhariaPorUsuario.set(id, { nome: usuario.nome, carga: 0, parados: 0 });
    }
  }
  for (const [id, dados] of engenhariaPorUsuario) {
    resultado.push({
      usuarioId: id,
      nome: dados.nome,
      papel: "ENGENHARIA",
      cargaAtual: dados.carga,
      itensParados: dados.parados,
      produzidoNoPeriodo: validadosPorUsuario.get(id) ?? 0,
    });
  }

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
