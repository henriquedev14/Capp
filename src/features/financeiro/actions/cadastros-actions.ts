"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

// ---------------------------------------------------------------------------
// Empresas do Grupo (ex: ConstruApp Fábrica, ConstruApp Projetos)
// ---------------------------------------------------------------------------

/**
 * Lista as Empresas do Grupo — extraído da página em 2.2.1 (item A4 da
 * auditoria: página não deve acessar Prisma direto).
 */
export async function listarEmpresasGrupo() {
  return prisma.empresaGrupo.findMany({ orderBy: { nome: "asc" } });
}

/**
 * Resumo pra tela principal do Financeiro: contadores de cadastros
 * ativos + agregados do mês (recebido, pago) + pendências totais —
 * extraído da página em 2.2.1 (item A4).
 */
export async function buscarResumoFinanceiro() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    empresasCount,
    categoriasCount,
    contasFixasCount,
    contasReceberPendentes,
    contasPagarPendentes,
    recebidoMesAgg,
    pagoMesAgg,
  ] = await Promise.all([
    prisma.empresaGrupo.count({ where: { ativo: true } }),
    prisma.categoriaDespesa.count({ where: { ativo: true } }),
    prisma.contaFixaModelo.count({ where: { ativo: true } }),
    prisma.contaReceber.aggregate({
      // Empreendimento arquivado (cancelado) some das pendências —
      // mesma regra já aplicada em listarDadosContasAReceber. Faturamento
      // avulso (empreendimentoId null) sempre conta, e o que já foi
      // recebido (recebidoMesAgg abaixo) não usa esse filtro, pois é
      // fato contábil consumado, não desaparece com o arquivamento.
      where: {
        recebido: false,
        OR: [{ empreendimentoId: null }, { empreendimento: { excluidoEm: null } }],
      },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({ where: { pago: false }, _sum: { valor: true }, _count: true }),
    prisma.contaReceber.aggregate({
      where: { recebido: true, recebidoEm: { gte: inicioMes } },
      _sum: { valor: true },
    }),
    prisma.contaPagar.aggregate({
      where: { pago: true, pagoEm: { gte: inicioMes } },
      _sum: { valor: true },
    }),
  ]);

  return {
    empresasCount,
    categoriasCount,
    contasFixasCount,
    contasReceberPendentesCount: contasReceberPendentes._count,
    contasReceberPendentesValor: Number(contasReceberPendentes._sum.valor ?? 0),
    contasPagarPendentesCount: contasPagarPendentes._count,
    contasPagarPendentesValor: Number(contasPagarPendentes._sum.valor ?? 0),
    recebidoMes: Number(recebidoMesAgg._sum.valor ?? 0),
    pagoMes: Number(pagoMesAgg._sum.valor ?? 0),
  };
}

export async function criarEmpresaGrupo(nome: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }


  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { erro: "Nome é obrigatório." };

  const existe = await prisma.empresaGrupo.findUnique({ where: { nome: nomeLimpo } });
  if (existe) return { erro: "Já existe uma empresa com este nome." };

  await prisma.empresaGrupo.create({ data: { nome: nomeLimpo } });
  revalidatePath("/financeiro/empresas");
  return { ok: true };
}

export async function toggleAtivoEmpresaGrupo(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const atual = await prisma.empresaGrupo.findUnique({ where: { id }, select: { ativo: true } });
  if (!atual) return { erro: "Empresa não encontrada." };
  await prisma.empresaGrupo.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath("/financeiro/empresas");
  return { ok: true };
}

export async function excluirEmpresaGrupo(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const emUso = await prisma.contaPagar.findFirst({ where: { empresaId: id }, select: { id: true } });
  if (emUso) {
    return { erro: "Não é possível excluir — já existem contas lançadas para esta empresa. Inative em vez de excluir." };
  }
  await prisma.empresaGrupo.delete({ where: { id } });
  revalidatePath("/financeiro/empresas");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Categorias de Despesa (ex: Folha de Pagamento, Aluguel, Frete)
// ---------------------------------------------------------------------------

/**
 * Lista as Categorias de Despesa — extraído da página em 2.2.1 (item A4).
 */
export async function listarCategoriasDespesa() {
  return prisma.categoriaDespesa.findMany({ orderBy: { nome: "asc" } });
}

export async function criarCategoriaDespesa(nome: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }


  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { erro: "Nome é obrigatório." };

  const existe = await prisma.categoriaDespesa.findUnique({ where: { nome: nomeLimpo } });
  if (existe) return { erro: "Já existe uma categoria com este nome." };

  await prisma.categoriaDespesa.create({ data: { nome: nomeLimpo } });
  revalidatePath("/financeiro/categorias");
  return { ok: true };
}

export async function toggleAtivoCategoriaDespesa(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const atual = await prisma.categoriaDespesa.findUnique({ where: { id }, select: { ativo: true } });
  if (!atual) return { erro: "Categoria não encontrada." };
  await prisma.categoriaDespesa.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath("/financeiro/categorias");
  return { ok: true };
}

export async function excluirCategoriaDespesa(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const emUso = await prisma.contaPagar.findFirst({ where: { categoriaId: id }, select: { id: true } });
  if (emUso) {
    return { erro: "Não é possível excluir — já existem contas lançadas nesta categoria. Inative em vez de excluir." };
  }
  await prisma.categoriaDespesa.delete({ where: { id } });
  revalidatePath("/financeiro/categorias");
  return { ok: true };
}

export async function classificarCategoriaDespesa(
  id: string,
  dados: {
    comportamento: "FIXO" | "SEMIFIXO" | "VARIAVEL" | null;
    natureza: "CUSTO" | "DESPESA" | null;
    apropriacao: "DIRETO" | "INDIRETO" | null;
  }
): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  await prisma.categoriaDespesa.update({
    where: { id },
    data: {
      comportamento: dados.comportamento,
      natureza: dados.natureza,
      apropriacao: dados.apropriacao,
    },
  });
  revalidatePath("/financeiro/categorias");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Segmentação de custos — soma o valor pago no mês corrente, agrupado
// pelos 3 eixos de classificação da categoria. Contas cuja categoria
// ainda não foi classificada caem em "Não classificado" em vez de sumir
// ou quebrar — sinaliza visualmente o que falta classificar.
// ---------------------------------------------------------------------------

export interface SegmentacaoCustos {
  porComportamento: { label: string; valor: number }[];
  porNatureza: { label: string; valor: number }[];
  porApropriacao: { label: string; valor: number }[];
  totalGeral: number;
  totalNaoClassificado: number;
}

export async function buscarSegmentacaoCustos(): Promise<SegmentacaoCustos> {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  const contas = await prisma.contaPagar.findMany({
    where: { pago: true, pagoEm: { gte: inicioMes, lt: fimMes } },
    select: {
      valor: true,
      categoria: { select: { comportamento: true, natureza: true, apropriacao: true } },
    },
  });

  const somarPor = (chave: "comportamento" | "natureza" | "apropriacao", labels: Record<string, string>) => {
    const mapa = new Map<string, number>();
    let naoClassificado = 0;
    for (const c of contas) {
      const valor = Number(c.valor);
      const v = c.categoria[chave];
      if (!v) {
        naoClassificado += valor;
        continue;
      }
      mapa.set(v, (mapa.get(v) ?? 0) + valor);
    }
    const resultado = Array.from(mapa.entries()).map(([k, valor]) => ({ label: labels[k] ?? k, valor }));
    if (naoClassificado > 0) resultado.push({ label: "Não classificado", valor: naoClassificado });
    return resultado;
  };

  const totalGeral = contas.reduce((s, c) => s + Number(c.valor), 0);
  const totalNaoClassificado = contas
    .filter((c) => !c.categoria.comportamento || !c.categoria.natureza || !c.categoria.apropriacao)
    .reduce((s, c) => s + Number(c.valor), 0);

  return {
    porComportamento: somarPor("comportamento", { FIXO: "Fixo", SEMIFIXO: "Semifixo/Semivariável", VARIAVEL: "Variável" }),
    porNatureza: somarPor("natureza", { CUSTO: "Custo (produção)", DESPESA: "Despesa (admin/vendas)" }),
    porApropriacao: somarPor("apropriacao", { DIRETO: "Direto", INDIRETO: "Indireto" }),
    totalGeral,
    totalNaoClassificado,
  };
}

// ---------------------------------------------------------------------------
// Metas de tempo por área — pra transformar o Desempenho das Áreas do
// dashboard de Diretoria em status de verdade (saudável/atenção/crítico).
// ---------------------------------------------------------------------------

export interface MetasPorArea {
  comercial: number | null;
  engenharia: number | null;
  orcamentacao: number | null;
  producao: number | null;
}

export async function buscarMetasPorArea(): Promise<MetasPorArea> {
  const config = await prisma.configuracaoSistema.findUnique({ where: { id: "default" } });
  return {
    comercial: config?.metaDiasComercial ? Number(config.metaDiasComercial) : null,
    engenharia: config?.metaDiasEngenharia ? Number(config.metaDiasEngenharia) : null,
    orcamentacao: config?.metaDiasOrcamentacao ? Number(config.metaDiasOrcamentacao) : null,
    producao: config?.metaDiasProducao ? Number(config.metaDiasProducao) : null,
  };
}

export async function atualizarMetasPorArea(metas: MetasPorArea): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    update: {
      metaDiasComercial: metas.comercial,
      metaDiasEngenharia: metas.engenharia,
      metaDiasOrcamentacao: metas.orcamentacao,
      metaDiasProducao: metas.producao,
    },
    create: {
      id: "default",
      metaDiasComercial: metas.comercial,
      metaDiasEngenharia: metas.engenharia,
      metaDiasOrcamentacao: metas.orcamentacao,
      metaDiasProducao: metas.producao,
    },
  });
  revalidatePath("/painel");
  return { ok: true };
}
