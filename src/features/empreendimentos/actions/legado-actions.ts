"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

export interface KitLegadoInput {
  kit: "ELETRICO" | "HIDRAULICO" | "QDC";
  quantidadeContratada: number;
  quantidadeEntregueHistorico: number;
  quantidadeProduzidaHistorico?: number;
}

export interface BaselineFinanceiroInput {
  valorContratado: number;
  faturadoHistorico: number;
  recebidoHistorico: number;
  quantidadeBaseUnidades: number;
}

export interface KitLegadoView {
  id: string;
  kit: string;
  quantidadeContratada: number;
  quantidadeEntregueHistorico: number;
  quantidadeProduzidaHistorico: number | null;
  quantidadeProduzidaPosErp: number; // real, vindo da Ordem de Produção
  entreguePosErp: number;
  totalEntregue: number; // histórico + expedição pós-ERP
  totalProduzido: number; // histórico conhecido/mínimo + produção pós-ERP
  saldoRestante: number; // saldo a produzir
}

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };

/**
 * Salva/atualiza os kits do Modo Legado + o baseline financeiro do
 * empreendimento. Modelagem final revisada com o Henrique em
 * 13/08/2026:
 *   - Financeiro fica no EMPREENDIMENTO (não no kit) — um recebimento
 *     pode cobrir vários kits ao mesmo tempo, sem informação real de
 *     rateio não faz sentido dividir por kit.
 *   - A Ordem de Produção nasce ZERADA (quantidadeAprovada = 0) — o
 *     histórico entregue fica só no KitLegado, nunca somado dentro da
 *     Ordem de Produção. Produção nova registrada pelo Terminal cresce
 *     a partir de zero, sem misturar com o passado.
 *   - A Tipologia criada é TÉCNICA (tecnica: true) — existe só pra
 *     satisfazer a estrutura interna (Ordem de Produção exige uma),
 *     nunca conta nos indicadores de tipologia.
 *   - Nenhuma Conta a Receber é criada aqui — financeiro posterior é
 *     100% manual, no fluxo normal (ver bloco 5).
 */
export async function salvarKitsLegado(
  empreendimentoId: string,
  baseline: BaselineFinanceiroInput,
  kits: KitLegadoInput[]
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (baseline.valorContratado <= 0) return { erro: "Valor do contrato inválido." };
  if (baseline.quantidadeBaseUnidades <= 0) return { erro: "Quantidade-base de unidades inválida." };
  if (baseline.faturadoHistorico < 0 || baseline.faturadoHistorico > baseline.valorContratado) {
    return { erro: "Valor faturado histórico inválido — não pode passar do contrato." };
  }
  if (baseline.recebidoHistorico < 0 || baseline.recebidoHistorico > baseline.faturadoHistorico) {
    return { erro: "Valor recebido histórico inválido — não pode passar do faturado." };
  }
  for (const k of kits) {
    if (k.quantidadeContratada <= 0) return { erro: `Quantidade contratada inválida pro kit ${k.kit}.` };
    if (k.quantidadeEntregueHistorico < 0 || k.quantidadeEntregueHistorico > k.quantidadeContratada) {
      return { erro: `Quantidade entregue histórico inválida pro kit ${k.kit} — não pode passar do contratado.` };
    }
  }

  const bancadaFinal = await prisma.bancada.findFirst({ where: { nome: "Finalização" }, select: { id: true } });
  if (!bancadaFinal) return { erro: 'Bancada "Finalização" não encontrada — configuração incompleta.' };

  // Status PRODUCAO direto — Legado pula Comercial/Orçamentação/
  // Negociação/Contrato/Suprimentos. Achado pelo Henrique em
  // 13/08/2026: status errado (CONTRATADO) deixava o card de Produção
  // bloqueado.
  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: {
      origemLegado: true,
      status: "PRODUCAO",
      legadoValorContratado: baseline.valorContratado,
      legadoFaturadoHistorico: baseline.faturadoHistorico,
      legadoRecebidoHistorico: baseline.recebidoHistorico,
      legadoQuantidadeBaseUnidades: baseline.quantidadeBaseUnidades,
    },
  });

  for (const k of kits) {
    const existente = await prisma.kitLegado.findUnique({
      where: { empreendimentoId_kit: { empreendimentoId, kit: k.kit } },
      select: { id: true, tipologiaId: true, ordemProducaoId: true },
    });

    if (existente) {
      if (existente.tipologiaId) {
        await prisma.tipologia.update({
          where: { id: existente.tipologiaId },
          data: { quantidadeUnidades: k.quantidadeContratada },
        });
      }
      if (existente.ordemProducaoId) {
        await prisma.ordemProducao.update({
          where: { id: existente.ordemProducaoId },
          data: { quantidadeAlvo: k.quantidadeContratada },
        });
      }
      await prisma.kitLegado.update({
        where: { id: existente.id },
        data: {
          quantidadeContratada: k.quantidadeContratada,
          quantidadeEntregueHistorico: k.quantidadeEntregueHistorico,
          quantidadeProduzidaHistorico: k.quantidadeProduzidaHistorico ?? null,
        },
      });
      continue;
    }

    const tipologia = await prisma.tipologia.create({
      data: {
        empreendimentoId,
        nome: `Legado — ${LABEL_KIT[k.kit]}`,
        quantidadeUnidades: k.quantidadeContratada,
        tecnica: true,
      },
    });

    const proximoNumero = await proximoNumeroOp();
    const ordemProducao = await prisma.ordemProducao.create({
      data: {
        numero: proximoNumero,
        tipologiaId: tipologia.id,
        bancadaId: bancadaFinal.id,
        quantidadeAlvo: k.quantidadeContratada,
        quantidadeAprovada: 0, // nasce ZERADA — nunca pré-preenchida com histórico
        status: "PENDENTE",
      },
    });

    await prisma.kitLegado.create({
      data: {
        empreendimentoId,
        kit: k.kit,
        quantidadeContratada: k.quantidadeContratada,
        quantidadeEntregueHistorico: k.quantidadeEntregueHistorico,
        quantidadeProduzidaHistorico: k.quantidadeProduzidaHistorico ?? null,
        tipologiaId: tipologia.id,
        ordemProducaoId: ordemProducao.id,
      },
    });
  }

  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  return { ok: true };
}

export async function desativarModoLegado(empreendimentoId: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  // Só tira a flag — Tipologia, Ordem de Produção e o baseline
  // continuam existindo normalmente. "Tudo guardado", como pedido.
  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { origemLegado: false },
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  return { ok: true };
}

export async function buscarKitsLegado(empreendimentoId: string): Promise<KitLegadoView[]> {
  const [kits, itensEntregues] = await Promise.all([
    prisma.kitLegado.findMany({
      where: { empreendimentoId },
      include: { ordemProducao: { select: { quantidadeAprovada: true } } },
      orderBy: { kit: "asc" },
    }),
    prisma.itemRemessa.findMany({
      where: { remessa: { empreendimentoId, deletedAt: null, status: "ENTREGUE" } },
      select: { tipoKit: true, quantidadeExpedida: true },
    }),
  ]);
  const entreguePorKit = new Map<string, number>();
  for (const item of itensEntregues) {
    entreguePorKit.set(item.tipoKit, (entreguePorKit.get(item.tipoKit) ?? 0) + item.quantidadeExpedida);
  }

  return kits.map((k) => {
    const produzidoPosErp = k.ordemProducao?.quantidadeAprovada ?? 0;
    // Se a quantidade produzida antes do ERP não foi informada, o mínimo
    // tecnicamente certo é o que já tinha sido entregue (não existe entrega
    // sem produção). Nunca usa produção pós-ERP como proxy de entrega.
    const produzidoHistoricoBase = Math.max(k.quantidadeProduzidaHistorico ?? 0, k.quantidadeEntregueHistorico);
    const totalProduzido = produzidoHistoricoBase + produzidoPosErp;
    const entreguePosErp = entreguePorKit.get(k.kit) ?? 0;
    const totalEntregue = k.quantidadeEntregueHistorico + entreguePosErp;
    return {
      id: k.id,
      kit: k.kit,
      quantidadeContratada: k.quantidadeContratada,
      quantidadeEntregueHistorico: k.quantidadeEntregueHistorico,
      quantidadeProduzidaHistorico: k.quantidadeProduzidaHistorico,
      quantidadeProduzidaPosErp: produzidoPosErp,
      entreguePosErp,
      totalEntregue,
      totalProduzido,
      saldoRestante: Math.max(0, k.quantidadeContratada - totalProduzido),
    };
  });
}

async function proximoNumeroOp(): Promise<string> {
  const ultima = await prisma.ordemProducao.findFirst({ orderBy: { numero: "desc" }, select: { numero: true } });
  const proximo = ultima ? parseInt(ultima.numero.slice(3), 10) + 1 : 1;
  return `OP-${String(proximo).padStart(6, "0")}`;
}

/**
 * Criação simplificada de empreendimento Legado — mínimo necessário,
 * sem torres/tipologias detalhadas/planilha/levantamento. Cria tudo
 * numa ação só. Pedido pelo Henrique em 13/08/2026.
 */
export async function criarEmpreendimentoLegado(input: {
  nome: string;
  clienteId: string;
  cidade: string;
  estado: string;
  endereco: string;
  tipo: string;
  construtora: string;
  responsavelComercial: string;
  baseline: BaselineFinanceiroInput;
  kits: KitLegadoInput[];
}): Promise<{ id: string } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!input.nome.trim()) return { erro: "Nome é obrigatório." };
  if (!input.clienteId) return { erro: "Escolha a construtora/cliente." };
  if (input.kits.length === 0) return { erro: "Informe pelo menos 1 kit." };

  const { gerarCodigoEmpreendimento } = await import("@/infra/db/codigos");
  const codigo = await gerarCodigoEmpreendimento();

  const empreendimento = await prisma.empreendimento.create({
    data: {
      codigo,
      nome: input.nome.trim(),
      clienteId: input.clienteId,
      cidade: input.cidade.trim(),
      estado: input.estado.trim().toUpperCase(),
      endereco: input.endereco.trim(),
      tipo: input.tipo as never,
      construtora: input.construtora.trim() || input.nome.trim(),
      responsavelComercial: input.responsavelComercial.trim() || "—",
      status: "PROSPECCAO", // provisório — salvarKitsLegado abaixo já sobrescreve pra PRODUCAO
      origemLegado: true,
    },
  });

  const resultado = await salvarKitsLegado(empreendimento.id, input.baseline, input.kits);
  if ("erro" in resultado) {
    return { erro: `Empreendimento criado, mas houve erro nos kits: ${resultado.erro}` };
  }

  return { id: empreendimento.id };
}
