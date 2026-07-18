"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";
import {
  calcularQuantidadeUH,
  calcularPercentualMeta,
  type Bancada,
  type OperadorProducao,
} from "@/core/producao/entities/producao";
import {
  calcularComprimentoReal,
  calcularComprimentoEletroduto,
} from "@/core/empreendimentos/entities/levantamento-eletrico";

function revalidar() {
  revalidatePath("/producao");
}

// ---------------------------------------------------------------------------
// Bancadas — cadastro fixo (5), só o U.H. Referência é ajustável
// ---------------------------------------------------------------------------

export async function listarBancadas(): Promise<Bancada[]> {
  const registros = await prisma.bancada.findMany({ orderBy: { ordem: "asc" } });
  return registros.map((b) => ({
    id: b.id,
    nome: b.nome,
    ordem: b.ordem,
    unidadeMedida: b.unidadeMedida,
    tipoCalculo: b.tipoCalculo,
    uhReferencia: Number(b.uhReferencia),
    ativo: b.ativo,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));
}

export async function atualizarUhReferenciaBancada(
  bancadaId: string,
  uhReferencia: number
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_GERENCIAR_CADASTRO);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (uhReferencia <= 0) return { erro: "O valor de referência precisa ser maior que zero." };

  await prisma.bancada.update({ where: { id: bancadaId }, data: { uhReferencia } });
  revalidar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Meta diária (U.H.) — guardada na ConfiguracaoSistema, mesmo padrão já
// usado pelos parâmetros do critério Ponto de Teto.
// ---------------------------------------------------------------------------

export async function buscarMetaProducaoDiaria(): Promise<number> {
  const config = await prisma.configuracaoSistema.findUnique({ where: { id: "default" } });
  return Number(config?.metaProducaoDiariaUH ?? 50);
}

export async function atualizarMetaProducaoDiaria(valor: number): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_GERENCIAR_CADASTRO);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (valor <= 0) return { erro: "A meta precisa ser maior que zero." };

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    update: { metaProducaoDiariaUH: valor },
    create: { id: "default", metaProducaoDiariaUH: valor },
  });
  revalidar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Operadores — cadastro simples, sem login próprio
// ---------------------------------------------------------------------------

export async function listarTipologiasDoEmpreendimento(empreendimentoId: string) {
  return prisma.tipologia.findMany({
    where: { empreendimentoId },
    select: { id: true, nome: true, statusProducao: true },
    orderBy: { nome: "asc" },
  });
}

export async function listarOperadores(): Promise<OperadorProducao[]> {
  const registros = await prisma.operadorProducao.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  return registros;
}

export async function editarNomeOperador(id: string, nome: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (!nome.trim()) return { erro: "Informe o nome do operador." };

  await prisma.operadorProducao.update({ where: { id }, data: { nome: nome.trim() } });
  revalidar();
  return { ok: true };
}

export async function criarOperador(nome: string): Promise<{ id: string } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (!nome.trim()) return { erro: "Informe o nome do operador." };

  const criado = await prisma.operadorProducao.create({ data: { nome: nome.trim() } });
  revalidar();
  return { id: criado.id };
}

// Regra de negócio explícita: operadores NÃO podem ser excluídos/
// desativados pelo sistema — só criar e editar o nome. Se um dia
// alguém sair da empresa, o histórico de produção dele continua válido
// (não faz sentido "sumir" com o operador e perder o rastro de quem
// produziu o quê).

// ---------------------------------------------------------------------------
// Registro de produção — o coração do tablet de bancada
// ---------------------------------------------------------------------------

/**
 * Lista as peças da tipologia (a partir do Levantamento Elétrico
 * validado), já com o comprimento de cabo e de eletroduto calculados —
 * pra escolher no tablet sem o operador precisar saber essas contas.
 */
export async function listarPecasDaTipologiaParaProducao(tipologiaId: string) {
  const levantamento = await prisma.levantamentoEletrico.findFirst({
    where: { tipologiaId, status: "VALIDADO" },
    include: { pecas: { include: { circuitos: true }, orderBy: { numero: "asc" } } },
  });
  if (!levantamento) return [];

  return levantamento.pecas.map((peca) => {
    const eletroduto = calcularComprimentoEletroduto(peca);
    const cabo = peca.circuitos.reduce(
      (soma, c) => soma + calcularComprimentoReal(peca, c.sobraOverride, c.horizOverride),
      0
    );
    return {
      id: peca.id,
      numero: peca.numero,
      trecho: peca.trecho,
      local: peca.local,
      metrosCabo: Math.round(cabo * 100) / 100,
      metrosEletroduto: Math.round(eletroduto * 100) / 100,
    };
  });
}

export async function registrarProducao(data: {
  bancadaId: string;
  operadorId: string;
  empreendimentoId: string;
  tipologiaId: string;
  pecaId: string;
  unidadesConcluidas: number;
  turno: "MANHA" | "TARDE" | "NOITE";
}): Promise<{ id: string } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const guardaArquivado = await verificarEmpreendimentoAtivo(data.empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  if (data.unidadesConcluidas <= 0) return { erro: "A quantidade de unidades precisa ser maior que zero." };

  const bancada = await prisma.bancada.findUnique({ where: { id: data.bancadaId } });
  if (!bancada) return { erro: "Bancada não encontrada." };

  const peca = await prisma.pecaLevantamento.findUnique({
    where: { id: data.pecaId },
    include: { circuitos: true },
  });
  if (!peca) return { erro: "Peça não encontrada." };

  // Quantidade bruta NUNCA é digitada — sempre derivada da peça (que já
  // vem calculada pelo Levantamento Elétrico) × quantas unidades foram
  // concluídas nesse lançamento. Isso garante que produção nunca diverge
  // do que foi tecnicamente levantado.
  let quantidadePorUnidade: number;
  if (bancada.tipoCalculo === "CABO") {
    quantidadePorUnidade = peca.circuitos.reduce(
      (soma, c) => soma + calcularComprimentoReal(peca, c.sobraOverride, c.horizOverride),
      0
    );
  } else if (bancada.tipoCalculo === "ELETRODUTO") {
    quantidadePorUnidade = calcularComprimentoEletroduto(peca);
  } else {
    quantidadePorUnidade = 1; // CONTAGEM — 1 peça = 1 unidade, sem metragem
  }

  const quantidade = Math.round(quantidadePorUnidade * data.unidadesConcluidas * 100) / 100;
  if (quantidade <= 0) {
    return { erro: "Essa peça não tem medida cadastrada pra essa bancada — confira o Levantamento Elétrico." };
  }

  const criado = await prisma.registroProducao.create({
    data: {
      bancadaId: data.bancadaId,
      operadorId: data.operadorId,
      empreendimentoId: data.empreendimentoId,
      tipologiaId: data.tipologiaId,
      pecaId: data.pecaId,
      unidadesConcluidas: data.unidadesConcluidas,
      turno: data.turno,
      quantidade,
      registradoPorUserId: sessao.user.id,
    },
  });
  revalidar();
  return { id: criado.id };
}

/**
 * Corrige um registro lançado errado — só supervisor/coordenador, e
 * guarda o valor original + quem corrigiu, pra manter rastro (nunca
 * apaga o histórico, só ajusta com auditoria).
 */
/**
 * Corrige um registro lançado errado — edita "unidades concluídas" (o
 * que o líder realmente digitou), recalculando a quantidade bruta do
 * MESMO jeito que o registro original (peça × bancada.tipoCalculo).
 * Só supervisor/coordenador, e guarda o valor original + quem corrigiu.
 */
export async function corrigirRegistroProducao(
  registroId: string,
  novasUnidadesConcluidas: number
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.PRODUCAO_CORRIGIR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (novasUnidadesConcluidas <= 0) return { erro: "A quantidade de unidades precisa ser maior que zero." };

  const atual = await prisma.registroProducao.findUnique({
    where: { id: registroId },
    include: { bancada: true, peca: { include: { circuitos: true } } },
  });
  if (!atual) return { erro: "Registro não encontrado." };

  const guardaArquivado = await verificarEmpreendimentoAtivo(atual.empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  let quantidadePorUnidade: number;
  if (atual.bancada.tipoCalculo === "CABO") {
    quantidadePorUnidade = atual.peca.circuitos.reduce(
      (soma, c) => soma + calcularComprimentoReal(atual.peca, c.sobraOverride, c.horizOverride),
      0
    );
  } else if (atual.bancada.tipoCalculo === "ELETRODUTO") {
    quantidadePorUnidade = calcularComprimentoEletroduto(atual.peca);
  } else {
    quantidadePorUnidade = 1;
  }
  const novaQuantidade = Math.round(quantidadePorUnidade * novasUnidadesConcluidas * 100) / 100;

  await prisma.registroProducao.update({
    where: { id: registroId },
    data: {
      unidadesConcluidas: novasUnidadesConcluidas,
      quantidade: novaQuantidade,
      valorOriginal: atual.valorOriginal ?? atual.quantidade, // preserva o PRIMEIRO valor original, não sobrescreve numa 2ª correção
      corrigidoPorUserId: sessao.user.id,
      corrigidoEm: new Date(),
    },
  });
  revalidar();
  return { ok: true };
}

export async function excluirRegistroProducao(registroId: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_CORRIGIR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const registro = await prisma.registroProducao.findUnique({ where: { id: registroId }, select: { empreendimentoId: true } });
  if (!registro) return { erro: "Registro não encontrado." };
  const guardaArquivado = await verificarEmpreendimentoAtivo(registro.empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  await prisma.registroProducao.delete({ where: { id: registroId } });
  revalidar();
  return { ok: true };
}

/** Registros de HOJE de uma bancada — pra tela do tablet mostrar o "já fiz hoje". */
export async function listarRegistrosHojeDaBancada(bancadaId: string, turno?: "MANHA" | "TARDE" | "NOITE") {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const registros = await prisma.registroProducao.findMany({
    where: { bancadaId, createdAt: { gte: inicioDia }, ...(turno ? { turno } : {}) },
    include: {
      operador: { select: { nome: true } },
      empreendimento: { select: { nome: true } },
      tipologia: { select: { nome: true } },
      peca: { select: { numero: true, trecho: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return registros.map((r) => ({
    id: r.id,
    operadorNome: r.operador.nome,
    empreendimentoNome: r.empreendimento.nome,
    tipologiaNome: r.tipologia.nome,
    pecaLabel: `Peça ${r.peca.numero} — ${r.peca.trecho}`,
    unidadesConcluidas: r.unidadesConcluidas,
    turno: r.turno,
    quantidade: Number(r.quantidade),
    corrigido: !!r.corrigidoEm,
    createdAt: r.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Analytics de Produção — substitui a planilha manual de produtividade.
// Mesma lógica: soma produção bruta por operador/bancada num período,
// converte pra U.H. (via uhReferencia da bancada) e compara com a meta
// diária × nº de dias do período.
// ---------------------------------------------------------------------------

export interface ProdutividadeLinha {
  operadorId: string;
  operadorNome: string;
  bancadaId: string;
  bancadaNome: string;
  producaoBruta: number;
  unidadeMedida: "METROS" | "PECAS";
  quantidadeUH: number;
  metaPeriodoUH: number;
  percentualMeta: number; // 0 a 1+ (pode passar de 1)
}

export async function calcularProdutividadePorOperador(
  inicio: Date,
  fim: Date
): Promise<ProdutividadeLinha[]> {
  const [registros, bancadas, metaDiaria] = await Promise.all([
    prisma.registroProducao.findMany({
      where: { createdAt: { gte: inicio, lt: fim } },
      select: {
        quantidade: true,
        operadorId: true,
        operador: { select: { nome: true } },
        bancadaId: true,
        bancada: { select: { nome: true, unidadeMedida: true, uhReferencia: true } },
      },
    }),
    listarBancadas(),
    buscarMetaProducaoDiaria(),
  ]);

  // Meta do período = meta diária × quantos dias o período cobre — pra
  // comparar de forma justa um "hoje" (1 dia) contra uma "semana" (7 dias).
  const dias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  const metaPeriodoUH = metaDiaria * dias;

  const chaves = new Map<string, ProdutividadeLinha>();
  for (const r of registros) {
    const chave = `${r.operadorId}-${r.bancadaId}`;
    const existente = chaves.get(chave);
    const quantidadeBruta = Number(r.quantidade);
    if (existente) {
      existente.producaoBruta += quantidadeBruta;
    } else {
      chaves.set(chave, {
        operadorId: r.operadorId,
        operadorNome: r.operador.nome,
        bancadaId: r.bancadaId,
        bancadaNome: r.bancada.nome,
        producaoBruta: quantidadeBruta,
        unidadeMedida: r.bancada.unidadeMedida,
        quantidadeUH: 0, // calculado abaixo, depois de somar tudo
        metaPeriodoUH,
        percentualMeta: 0,
      });
    }
  }

  const bancadasPorId = new Map(bancadas.map((b) => [b.id, b]));
  const linhas = Array.from(chaves.values()).map((linha) => {
    const bancada = bancadasPorId.get(linha.bancadaId);
    const uhRef = bancada?.uhReferencia ?? 1;
    const quantidadeUH = calcularQuantidadeUH(linha.producaoBruta, uhRef);
    return {
      ...linha,
      quantidadeUH,
      percentualMeta: calcularPercentualMeta(quantidadeUH, metaPeriodoUH),
    };
  });

  return linhas.sort((a, b) => b.percentualMeta - a.percentualMeta);
}

/**
 * Progresso de uma peça numa bancada específica — quantas unidades já
 * foram concluídas (soma de todos os registros dessa combinação) contra
 * o total que a tipologia precisa. Gap real identificado: sem isso, o
 * líder tinha que "saber de cabeça" quanto já tinha feito.
 */
export async function buscarProgressoPeca(
  bancadaId: string,
  tipologiaId: string,
  pecaId: string
): Promise<{ concluidas: number; total: number }> {
  const [soma, tipologia] = await Promise.all([
    prisma.registroProducao.aggregate({
      where: { bancadaId, tipologiaId, pecaId },
      _sum: { unidadesConcluidas: true },
    }),
    prisma.tipologia.findUnique({ where: { id: tipologiaId }, select: { quantidadeUnidades: true } }),
  ]);
  return {
    concluidas: soma._sum.unidadesConcluidas ?? 0,
    total: tipologia?.quantidadeUnidades ?? 0,
  };
}

/**
 * Lista as peças de uma tipologia com o progresso de cada uma numa
 * bancada — pra tela mostrar "o que fazer hoje" (o que ainda falta),
 * não uma lista solta sem contexto de quanto já foi feito.
 */
export async function listarPecasComProgresso(bancadaId: string, tipologiaId: string) {
  const [pecas, registros, tipologia] = await Promise.all([
    listarPecasDaTipologiaParaProducao(tipologiaId),
    prisma.registroProducao.groupBy({
      by: ["pecaId"],
      where: { bancadaId, tipologiaId },
      _sum: { unidadesConcluidas: true },
    }),
    prisma.tipologia.findUnique({ where: { id: tipologiaId }, select: { quantidadeUnidades: true } }),
  ]);

  const concluidasPorPeca = new Map(registros.map((r) => [r.pecaId, r._sum.unidadesConcluidas ?? 0]));
  const total = tipologia?.quantidadeUnidades ?? 0;

  return pecas.map((p) => ({
    ...p,
    concluidas: concluidasPorPeca.get(p.id) ?? 0,
    total,
    completa: total > 0 && (concluidasPorPeca.get(p.id) ?? 0) >= total,
  }));
}

/** Registros recentes (últimos N dias, todas as bancadas) — pra tela de correção do supervisor. */
export async function listarRegistrosRecentes(dias = 7) {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  desde.setHours(0, 0, 0, 0);

  const registros = await prisma.registroProducao.findMany({
    where: { createdAt: { gte: desde } },
    include: {
      operador: { select: { nome: true } },
      empreendimento: { select: { nome: true } },
      tipologia: { select: { nome: true } },
      bancada: { select: { nome: true, unidadeMedida: true } },
      peca: { select: { numero: true, trecho: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return registros.map((r) => ({
    id: r.id,
    operadorNome: r.operador.nome,
    empreendimentoNome: r.empreendimento.nome,
    tipologiaNome: r.tipologia.nome,
    bancadaNome: r.bancada.nome,
    unidadeMedida: r.bancada.unidadeMedida,
    pecaLabel: `Peça ${r.peca.numero} — ${r.peca.trecho}`,
    unidadesConcluidas: r.unidadesConcluidas,
    quantidade: Number(r.quantidade),
    corrigido: !!r.corrigidoEm,
    createdAt: r.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Kits (apartamentos) finalizados — a métrica REAL de produção da
// fábrica: só conta como pronto quando passa pela bancada de
// Finalização (última etapa). Diferente do U.H. por bancada (que é uma
// moeda de comparação de produtividade individual, não o output real).
// ---------------------------------------------------------------------------

export interface KitsFinalizados {
  quantidade: number;
  meta: number;
  percentual: number;
}

export async function contarKitsFinalizados(inicio: Date, fim: Date): Promise<KitsFinalizados> {
  const bancadaFinalizacao = await prisma.bancada.findUnique({ where: { nome: "Finalização" } });
  if (!bancadaFinalizacao) return { quantidade: 0, meta: 50, percentual: 0 };

  const soma = await prisma.registroProducao.aggregate({
    where: { bancadaId: bancadaFinalizacao.id, createdAt: { gte: inicio, lt: fim } },
    _sum: { unidadesConcluidas: true },
  });

  const dias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  const meta = 50 * dias;
  const quantidade = soma._sum.unidadesConcluidas ?? 0;

  return { quantidade, meta, percentual: meta > 0 ? quantidade / meta : 0 };
}

/**
 * Coloca/tira uma tipologia de stand-by — pausa intencional (ex: cliente
 * pediu, pendência comercial/financeira), diferente de "atrasado". Some
 * da fila de risco enquanto em stand-by.
 */
export async function alterarStatusProducaoTipologia(
  tipologiaId: string,
  status: "ATIVA" | "STANDBY" | "CONCLUIDA"
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.PRODUCAO_VER_DASHBOARD);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const tipologia = await prisma.tipologia.findUnique({ where: { id: tipologiaId }, select: { empreendimentoId: true } });
  if (!tipologia) return { erro: "Tipologia não encontrada." };
  const guardaArquivado = await verificarEmpreendimentoAtivo(tipologia.empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  await prisma.tipologia.update({ where: { id: tipologiaId }, data: { statusProducao: status } });
  revalidatePath("/producao");
  return { ok: true };
}
