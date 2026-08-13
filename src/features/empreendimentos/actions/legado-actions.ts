"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

export interface KitLegadoInput {
  kit: "ELETRICO" | "HIDRAULICO" | "QDC";
  quantidadeTotal: number;
  quantidadeEntregue: number;
  valorContrato: number;
  valorFaturado: number;
}

export interface KitLegadoView {
  id: string;
  kit: string;
  quantidadeTotal: number;
  quantidadeAprovada: number; // valor real, vindo da Ordem de Produção
  valorContrato: number;
  valorFaturadoInicial: number;
  saldoAReceber: number; // valor real, vindo da Conta a Receber pendente
}

const LABEL_BANCADA_FINAL = "Finalização";

/**
 * Modo Legado — pra empreendimentos que já estavam em andamento antes
 * do ConstruApp existir. Cada kit informado aqui gera, de verdade:
 *   - 1 Tipologia "Legado" (pra existir uma unidade de trabalho)
 *   - 1 Ordem de Produção na bancada final, já com o que foi entregue
 *     até aqui — dali pra frente, o tablet físico soma em cima normal
 *   - 1 Conta a Receber com o SALDO que falta faturar (valor do
 *     contrato menos o que já foi faturado) — o "já faturado" fica só
 *     como campo informativo, não vira lançamento retroativo no caixa
 *     (evita distorcer relatórios de um período que já passou)
 *
 * Chamar de novo com o mesmo kit ATUALIZA os registros existentes, não
 * duplica — identificado pela combinação (empreendimentoId, kit).
 * Desenhado com o Henrique em 12-13/08/2026.
 */
export async function salvarKitsLegado(
  empreendimentoId: string,
  kits: KitLegadoInput[]
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  for (const k of kits) {
    if (k.quantidadeTotal <= 0) return { erro: `Quantidade total inválida pro kit ${k.kit}.` };
    if (k.quantidadeEntregue < 0 || k.quantidadeEntregue > k.quantidadeTotal) {
      return { erro: `Quantidade entregue inválida pro kit ${k.kit} — não pode passar do total.` };
    }
    if (k.valorContrato <= 0) return { erro: `Valor do contrato inválido pro kit ${k.kit}.` };
    if (k.valorFaturado < 0 || k.valorFaturado > k.valorContrato) {
      return { erro: `Valor faturado inválido pro kit ${k.kit} — não pode passar do contrato.` };
    }
  }

  const bancadaFinal = await prisma.bancada.findFirst({
    where: { nome: LABEL_BANCADA_FINAL },
    select: { id: true },
  });
  if (!bancadaFinal) return { erro: `Bancada "${LABEL_BANCADA_FINAL}" não encontrada — configuração incompleta.` };

  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { origemLegado: true },
  });

  for (const k of kits) {
    const existente = await prisma.kitLegado.findUnique({
      where: { empreendimentoId_kit: { empreendimentoId, kit: k.kit } },
      select: { id: true, tipologiaId: true, ordemProducaoId: true, contaReceberId: true },
    });

    const saldoAReceber = k.valorContrato - k.valorFaturado;

    if (existente) {
      // Atualiza os 3 registros de verdade, sem duplicar.
      if (existente.tipologiaId) {
        await prisma.tipologia.update({
          where: { id: existente.tipologiaId },
          data: { quantidadeUnidades: k.quantidadeTotal },
        });
      }
      if (existente.ordemProducaoId) {
        await prisma.ordemProducao.update({
          where: { id: existente.ordemProducaoId },
          data: {
            quantidadeAlvo: k.quantidadeTotal,
            quantidadeAprovada: k.quantidadeEntregue,
            status: k.quantidadeEntregue >= k.quantidadeTotal ? "CONCLUIDA" : "PENDENTE",
          },
        });
      }
      if (existente.contaReceberId) {
        if (saldoAReceber <= 0) {
          await prisma.contaReceber.update({
            where: { id: existente.contaReceberId },
            data: { valor: 0, recebido: true, recebidoEm: new Date() },
          });
        } else {
          await prisma.contaReceber.update({
            where: { id: existente.contaReceberId },
            data: { valor: saldoAReceber },
          });
        }
      }
      await prisma.kitLegado.update({
        where: { id: existente.id },
        data: {
          quantidadeTotal: k.quantidadeTotal,
          valorContrato: k.valorContrato,
          quantidadeEntregueInicial: k.quantidadeEntregue,
          valorFaturadoInicial: k.valorFaturado,
        },
      });
      continue;
    }

    // Cria os 3 registros de verdade + o KitLegado que amarra tudo.
    const tipologia = await prisma.tipologia.create({
      data: {
        empreendimentoId,
        nome: `Legado — ${LABEL_KIT[k.kit]}`,
        quantidadeUnidades: k.quantidadeTotal,
      },
    });

    const proximoNumero = await proximoNumeroOp();
    const ordemProducao = await prisma.ordemProducao.create({
      data: {
        numero: proximoNumero,
        tipologiaId: tipologia.id,
        bancadaId: bancadaFinal.id,
        quantidadeAlvo: k.quantidadeTotal,
        quantidadeAprovada: k.quantidadeEntregue,
        status: k.quantidadeEntregue >= k.quantidadeTotal ? "CONCLUIDA" : "PENDENTE",
      },
    });

    const contaReceber =
      saldoAReceber > 0
        ? await prisma.contaReceber.create({
            data: {
              empreendimentoId,
              tipo: "ENTRADA",
              valor: saldoAReceber,
              recebido: false,
              observacoes: `Saldo do contrato legado (kit ${LABEL_KIT[k.kit]}) — valor total R$ ${k.valorContrato.toFixed(2)}, já faturado R$ ${k.valorFaturado.toFixed(2)} antes do cadastro no sistema.`,
            },
          })
        : null;

    await prisma.kitLegado.create({
      data: {
        empreendimentoId,
        kit: k.kit,
        quantidadeTotal: k.quantidadeTotal,
        valorContrato: k.valorContrato,
        quantidadeEntregueInicial: k.quantidadeEntregue,
        valorFaturadoInicial: k.valorFaturado,
        tipologiaId: tipologia.id,
        ordemProducaoId: ordemProducao.id,
        contaReceberId: contaReceber?.id ?? null,
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

  // Só tira a flag — os registros criados (Tipologia, Ordem de
  // Produção, Conta a Receber) continuam existindo normalmente, como
  // qualquer outro dado real do sistema. "Tudo guardado", como pedido.
  await prisma.empreendimento.update({
    where: { id: empreendimentoId },
    data: { origemLegado: false },
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  return { ok: true };
}

export async function buscarKitsLegado(empreendimentoId: string): Promise<KitLegadoView[]> {
  const kits = await prisma.kitLegado.findMany({
    where: { empreendimentoId },
    include: {
      ordemProducao: { select: { quantidadeAprovada: true } },
      contaReceber: { select: { valor: true, recebido: true } },
    },
    orderBy: { kit: "asc" },
  });

  return kits.map((k) => ({
    id: k.id,
    kit: k.kit,
    quantidadeTotal: k.quantidadeTotal,
    quantidadeAprovada: k.ordemProducao?.quantidadeAprovada ?? k.quantidadeEntregueInicial,
    valorContrato: Number(k.valorContrato),
    valorFaturadoInicial: Number(k.valorFaturadoInicial),
    saldoAReceber: k.contaReceber && !k.contaReceber.recebido ? Number(k.contaReceber.valor) : 0,
  }));
}

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };

async function proximoNumeroOp(): Promise<string> {
  const ultima = await prisma.ordemProducao.findFirst({ orderBy: { numero: "desc" }, select: { numero: true } });
  const proximo = ultima ? parseInt(ultima.numero.slice(3), 10) + 1 : 1;
  return `OP-${String(proximo).padStart(6, "0")}`;
}

/**
 * Criação SIMPLIFICADA de empreendimento em Modo Legado — pra quando
 * não tem nada além do básico (sem torres, sem tipologias detalhadas,
 * sem planilha de material, sem levantamento). Cria o empreendimento
 * com o mínimo necessário e já ativa o Legado com os kits informados,
 * tudo numa ação só. Pedido pelo Henrique em 13/08/2026: "desde o
 * começo já mostre a opção do legado".
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
      status: "CONTRATADO",
      origemLegado: true,
    },
  });

  const resultado = await salvarKitsLegado(empreendimento.id, input.kits);
  if ("erro" in resultado) {
    // Empreendimento já foi criado — não desfaz, só avisa. É mais
    // seguro corrigir os kits depois do que perder o cadastro todo.
    return { erro: `Empreendimento criado, mas houve erro nos kits: ${resultado.erro}` };
  }

  return { id: empreendimento.id };
}
