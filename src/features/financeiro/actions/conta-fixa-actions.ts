"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

export interface DadosContaFixa {
  empresaId: string;
  categoriaId: string;
  descricao: string;
  valor: number;
  diaUtilVencimento: number;
  observacoes?: string;
}

export async function criarContaFixaModelo(dados: DadosContaFixa): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!dados.descricao.trim()) return { erro: "Descrição é obrigatória." };
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) return { erro: "Valor inválido." };
  if (!Number.isFinite(dados.diaUtilVencimento) || dados.diaUtilVencimento < 1 || dados.diaUtilVencimento > 31) {
    return { erro: "Dia útil de vencimento inválido." };
  }

  await prisma.contaFixaModelo.create({
    data: {
      empresaId: dados.empresaId,
      categoriaId: dados.categoriaId,
      descricao: dados.descricao.trim(),
      valor: dados.valor,
      diaUtilVencimento: dados.diaUtilVencimento,
      observacoes: dados.observacoes?.trim() || null,
    },
  });

  revalidatePath("/financeiro/contas-fixas");
  return { ok: true };
}

export async function editarContaFixaModelo(
  id: string,
  dados: DadosContaFixa
): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!dados.descricao.trim()) return { erro: "Descrição é obrigatória." };
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) return { erro: "Valor inválido." };
  if (!Number.isFinite(dados.diaUtilVencimento) || dados.diaUtilVencimento < 1 || dados.diaUtilVencimento > 31) {
    return { erro: "Dia útil de vencimento inválido." };
  }

  await prisma.contaFixaModelo.update({
    where: { id },
    data: {
      empresaId: dados.empresaId,
      categoriaId: dados.categoriaId,
      descricao: dados.descricao.trim(),
      valor: dados.valor,
      diaUtilVencimento: dados.diaUtilVencimento,
      observacoes: dados.observacoes?.trim() || null,
    },
  });

  revalidatePath("/financeiro/contas-fixas");
  return { ok: true };
}

export async function toggleAtivoContaFixaModelo(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  const atual = await prisma.contaFixaModelo.findUnique({ where: { id }, select: { ativo: true } });
  if (!atual) return { erro: "Conta fixa não encontrada." };
  await prisma.contaFixaModelo.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath("/financeiro/contas-fixas");
  return { ok: true };
}

export async function excluirContaFixaModelo(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await prisma.contaFixaModelo.delete({ where: { id } });
  revalidatePath("/financeiro/contas-fixas");
  return { ok: true };
}

/**
 * Calcula a data do Nº-ésimo dia útil de um mês (pula sábado e domingo —
 * não considera feriados nacionais, isso é uma simplificação consciente
 * para a Fase 1; pode ser refinado depois com uma tabela de feriados).
 */
function calcularDataDiaUtil(ano: number, mes: number, diaUtil: number): Date {
  let contados = 0;
  let dia = 1;
  while (contados < diaUtil) {
    const data = new Date(ano, mes - 1, dia);
    const diaSemana = data.getDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      contados++;
      if (contados === diaUtil) return data;
    }
    dia++;
  }
  return new Date(ano, mes - 1, dia);
}

/**
 * Gera os lançamentos (ContaPagar) do mês/ano informado, um por cada
 * ContaFixaModelo ativo.
 *
 * Idempotência real: a dupla (contaFixaModeloId, anoReferencia,
 * mesReferencia) tem constraint única no banco (@@unique no schema).
 * `createMany` com `skipDuplicates: true` faz a inserção inteira em UM
 * INSERT atômico — o Postgres resolve o conflito linha a linha durante o
 * próprio comando, não existe janela entre "verificar" e "criar" pra uma
 * corrida (2 cliques, 2 abas, retry de rede) se encaixar. Antes daqui isso
 * era um findFirst-depois-create (checagem por código): mesma classe de
 * bug já corrigida no arquivar/restaurar do C2/C3.1-A.
 */
export async function gerarContasFixasDoMes(
  ano: number,
  mes: number
): Promise<Resultado & { geradas?: number }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const modelos = await prisma.contaFixaModelo.findMany({ where: { ativo: true } });
  if (modelos.length === 0) {
    return { erro: "Nenhuma conta fixa ativa cadastrada." };
  }

  const dadosParaCriar = modelos.map((modelo) => ({
    empresaId: modelo.empresaId,
    categoriaId: modelo.categoriaId,
    contaFixaModeloId: modelo.id,
    descricao: modelo.descricao,
    tipo: "FIXA" as const,
    valor: modelo.valor,
    dataVencimento: calcularDataDiaUtil(ano, mes, modelo.diaUtilVencimento),
    anoReferencia: ano,
    mesReferencia: mes,
    criadoPorId: sessao.user.id,
  }));

  const resultado = await prisma.contaPagar.createMany({
    data: dadosParaCriar,
    skipDuplicates: true,
  });

  revalidatePath("/financeiro");
  return { ok: true, geradas: resultado.count };
}
