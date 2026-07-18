"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

export async function marcarContaReceberComoRecebida(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_BAIXAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await prisma.contaReceber.update({
    where: { id },
    data: { recebido: true, recebidoEm: new Date() },
  });
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function desfazerRecebimentoConta(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_BAIXAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await prisma.contaReceber.update({
    where: { id },
    data: { recebido: false, recebidoEm: null },
  });
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function atualizarContaReceber(
  id: string,
  dados: { empresaId?: string | null; dataPrevista?: string; valor?: number; observacoes?: string }
): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const data: Record<string, unknown> = {};
  if (dados.empresaId !== undefined) data.empresaId = dados.empresaId || null;
  if (dados.dataPrevista) {
    const d = new Date(dados.dataPrevista);
    if (isNaN(d.getTime())) return { erro: "Data inválida." };
    data.dataPrevista = d;
  }
  if (dados.valor !== undefined) {
    if (!Number.isFinite(dados.valor) || dados.valor <= 0) return { erro: "Valor inválido." };
    data.valor = dados.valor;
  }
  if (dados.observacoes !== undefined) data.observacoes = dados.observacoes.trim() || null;

  await prisma.contaReceber.update({ where: { id }, data });
  revalidatePath("/financeiro");
  return { ok: true };
}

const DIAS_PRAZO_PAGAMENTO = 28;

/**
 * Registra que um pavimento foi enviado — só então a parcela dessa
 * remessa ganha data prevista de recebimento (data do envio + 28 dias).
 * Fica aqui como gatilho manual até existir o módulo de Produção de
 * verdade, que vai chamar isso automaticamente quando uma remessa sair.
 */
/**
 * Cronograma — o Comercial estima quando cada pavimento deve sair, logo
 * depois do contrato fechar, SEM precisar esperar a produção de verdade
 * acontecer. Isso alimenta a projeção de faturamento (Fluxo de Caixa,
 * Receita Prevista no Analytics) desde já, com uma estimativa.
 *
 * Diferente de registrarEnvioRemessa: aqui NÃO mexe em `dataEnvio` (que
 * significa "já saiu de verdade") — só define `dataPrevista` como uma
 * projeção. Quando o envio real acontecer, registrarEnvioRemessa
 * substitui essa projeção pela data confirmada.
 */
export async function definirDataProjetada(
  contaReceberId: string,
  dataProjetada: string
): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const data = new Date(dataProjetada);
  if (isNaN(data.getTime())) return { erro: "Data inválida." };

  const atual = await prisma.contaReceber.findUnique({
    where: { id: contaReceberId },
    select: { dataEnvio: true },
  });
  if (atual?.dataEnvio) {
    return { erro: "Esse pavimento já teve o envio registrado — a data real não pode ser trocada por uma projeção." };
  }

  await prisma.contaReceber.update({
    where: { id: contaReceberId },
    data: { dataPrevista: data },
  });

  revalidatePath("/financeiro/contas-a-receber");
  return { ok: true };
}

export async function registrarEnvioRemessa(
  contaReceberId: string,
  dataEnvio: string
): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const data = new Date(dataEnvio);
  if (isNaN(data.getTime())) return { erro: "Data inválida." };

  const dataPrevista = new Date(data);
  dataPrevista.setDate(dataPrevista.getDate() + DIAS_PRAZO_PAGAMENTO);

  await prisma.contaReceber.update({
    where: { id: contaReceberId },
    data: { dataEnvio: data, dataPrevista },
  });

  revalidatePath("/financeiro/contas-a-receber");
  return { ok: true };
}
