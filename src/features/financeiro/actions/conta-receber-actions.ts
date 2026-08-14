"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

/**
 * Lista empresas ativas + todas as contas a receber (com dados
 * "achatados" pra tela) — extraído da página em 2.2.1 (item A4).
 */
/**
 * Exclui uma conta a receber — urgente 28/07/2026 (ainda não existia
 * forma de apagar um lançamento avulso feito por engano).
 */
export async function excluirContaReceber(id: string): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_EXCLUIR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const conta = await prisma.contaReceber.findUnique({ where: { id } });
  if (!conta) return { erro: "Conta não encontrada." };
  if (conta.recebido) return { erro: "Não é possível excluir uma conta já marcada como recebida." };

  await prisma.contaReceber.delete({ where: { id } });

  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
  revalidatePath("/painel");
  return { ok: true };
}

export async function listarDadosContasAReceber() {
  const [empresas, contasReceberRaw] = await Promise.all([
    prisma.empresaGrupo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.contaReceber.findMany({
      where: {
        // Empreendimento arquivado (cancelado) some da lista de trabalho
        // — mas só o que ainda não foi recebido. O que já foi recebido
        // de verdade fica no histórico, é fato contábil consumado, não
        // desaparece. Pedido pelo Henrique em 28/07/2026 (2ª vez — antes
        // só tinha tirado dos totais, agora tira da lista também).
        OR: [
          { recebido: true },
          { empreendimentoId: null },
          { empreendimento: { excluidoEm: null } },
        ],
      },
      include: {
        empreendimento: { select: { id: true, nome: true, excluidoEm: true } },
        empresa: true,
        pavimento: { select: { nome: true } },
      },
      orderBy: [{ empreendimentoId: "asc" }, { tipo: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const contasReceber = contasReceberRaw.map((c) => ({
    id: c.id,
    empreendimentoId: c.empreendimento?.id ?? null,
    empreendimentoNome: c.empreendimento?.nome ?? c.nomeAvulso ?? "(sem nome)",
    // Empreendimento arquivado (cancelado) — a linha continua aparecendo
    // na lista (financeiro nunca esconde), mas os totais em destaque não
    // devem mais contar esse valor como algo real a receber. Achado
    // pelo Henrique em 28/07/2026, depois de arquivar um teste.
    empreendimentoArquivado: c.empreendimento?.excluidoEm != null,
    tipo: c.tipo,
    pavimentoNome: c.pavimento?.nome ?? null,
    valor: Number(c.valor),
    dataEnvio: c.dataEnvio ? c.dataEnvio.toISOString() : null,
    dataPrevista: c.dataPrevista ? c.dataPrevista.toISOString() : null,
    recebido: c.recebido,
    empresaId: c.empresaId,
    empresaNome: c.empresa?.nome ?? null,
    boletoNome: c.boletoNome,
  }));

  return { empresas, contasReceber };
}

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
  revalidatePath("/painel");
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
  revalidatePath("/painel");
  return { ok: true };
}

/**
 * Lista empreendimentos ativos (não arquivados) pro seletor de
 * faturamento avulso.
 */
export async function listarEmpreendimentosParaFaturamento() {
  return prisma.empreendimento.findMany({
    where: { excluidoEm: null, status: { not: "ARQUIVADO" } },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

/**
 * Lista os pavimentos de um empreendimento (via Torre direto ou via
 * Bloco dentro de Torre) — pra escolher qual "remessa" o faturamento
 * avulso corresponde. Mesma lógica de busca usada no cronograma
 * automático (criarContaReceberAutomatica).
 */
export async function listarPavimentosParaFaturamento(empreendimentoId: string) {
  const torres = await prisma.torre.findMany({
    where: { empreendimentoId },
    include: {
      pavimentos: { select: { id: true, nome: true }, orderBy: { ordem: "asc" } },
      blocos: {
        include: { pavimentos: { select: { id: true, nome: true }, orderBy: { ordem: "asc" } } },
        orderBy: { ordem: "asc" },
      },
    },
    orderBy: { ordem: "asc" },
  });

  const pavimentos: { id: string; nome: string }[] = [];
  for (const torre of torres) {
    for (const p of torre.pavimentos) pavimentos.push({ id: p.id, nome: `${torre.nome} — ${p.nome}` });
    for (const bloco of torre.blocos) {
      for (const p of bloco.pavimentos) {
        pavimentos.push({ id: p.id, nome: `${torre.nome} / ${bloco.nome} — ${p.nome}` });
      }
    }
  }
  return pavimentos;
}

interface DadosContaReceberAvulsa {
  empreendimentoId?: string | null;
  nomeAvulso?: string;
  tipo: "ENTRADA" | "REMESSA";
  pavimentoId?: string | null;
  empresaId?: string | null;
  valor: number;
  dataPrevista?: string;
  observacoes?: string;
}

/**
 * Lança uma Conta a Receber avulsa/manual — pedido pelo Henrique em
 * 28/07/2026: até então só existia a criação automática (20% de
 * entrada + parcelas por pavimento), sem forma de lançar algo fora
 * desse padrão (ex: cobrança extra, ajuste, acordo específico).
 *
 * Aceita OU um empreendimentoId real, OU um nomeAvulso digitado — pra
 * cobrir projetos em execução desde antes do ConstruApp existir
 * (pré-implantação), que ainda não têm Empreendimento cadastrado.
 */
export async function criarContaReceberAvulsa(
  dados: DadosContaReceberAvulsa
): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_LANCAR_CONTA);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const nomeAvulso = dados.nomeAvulso?.trim() || null;
  if (!dados.empreendimentoId && !nomeAvulso) {
    return { erro: "Escolha um empreendimento cadastrado ou digite o nome do projeto (pré-implantação)." };
  }
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) return { erro: "Valor inválido." };

  // Legado não tem torres/pavimentos — pavimento deixa de ser
  // obrigatório em REMESSA quando o empreendimento está em Modo
  // Legado. Empreendimento normal continua exigindo, sem mudança.
  // Achado pelo Henrique em 13/08/2026.
  let empreendimentoEhLegado = false;
  if (dados.empreendimentoId) {
    const emp = await prisma.empreendimento.findUnique({
      where: { id: dados.empreendimentoId },
      select: { origemLegado: true },
    });
    empreendimentoEhLegado = emp?.origemLegado ?? false;
  }
  if (dados.tipo === "REMESSA" && dados.empreendimentoId && !empreendimentoEhLegado && !dados.pavimentoId) {
    return { erro: "Escolha o pavimento (remessa) correspondente." };
  }

  let dataPrevista: Date | undefined;
  if (dados.dataPrevista) {
    const d = new Date(dados.dataPrevista);
    if (isNaN(d.getTime())) return { erro: "Data inválida." };
    dataPrevista = d;
  }

  await prisma.contaReceber.create({
    data: {
      empreendimentoId: dados.empreendimentoId || null,
      nomeAvulso: dados.empreendimentoId ? null : nomeAvulso,
      tipo: dados.tipo,
      pavimentoId: dados.tipo === "REMESSA" && dados.empreendimentoId ? dados.pavimentoId : null,
      empresaId: dados.empresaId || null,
      valor: dados.valor,
      dataPrevista,
      observacoes: dados.observacoes?.trim() || null,
    },
  });

  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
  revalidatePath("/painel");
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
  revalidatePath("/painel");
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
  revalidatePath("/painel");
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
  revalidatePath("/painel");
  return { ok: true };
}
