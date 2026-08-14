"use server";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { criarRemessaAction } from "@/features/expedicao/actions/expedicao-actions";

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };

/**
 * Remessa Legado simplificada — reaproveita o modelo formal de
 * Expedição (Remessa/ItemRemessa), que já suporta torre/pavimento
 * OPCIONAIS. Não precisou mudar o schema — só monta os campos certos
 * sem exigir estrutura física que o Legado não tem. Opção A da
 * modelagem, decidida com o Henrique em 13/08/2026.
 *
 * Rastreabilidade sem pavimento: kit + quantidade + data + referência
 * (texto livre), no lugar de torre/pavimento.
 */
export async function criarRemessaLegado(input: {
  empreendimentoId: string;
  kit: "ELETRICO" | "HIDRAULICO" | "QDC";
  quantidade: number;
  dataEntregaPrevista?: string;
  referencia: string;
}): Promise<{ ok: true; id: string; numero: string } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (input.quantidade <= 0) return { erro: "Quantidade inválida." };
  if (!input.referencia.trim()) return { erro: "Descrição/referência é obrigatória." };

  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: input.empreendimentoId },
    select: {
      clienteId: true,
      endereco: true,
      cidade: true,
      estado: true,
      origemLegado: true,
    },
  });
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };
  if (!empreendimento.origemLegado) {
    return { erro: "Esse fluxo simplificado é só pra empreendimentos em Modo Legado." };
  }

  const kitLegado = await prisma.kitLegado.findUnique({
    where: { empreendimentoId_kit: { empreendimentoId: input.empreendimentoId, kit: input.kit } },
    select: { tipologiaId: true },
  });
  if (!kitLegado?.tipologiaId) {
    return { erro: `Kit ${LABEL_KIT[input.kit]} não está cadastrado nesse empreendimento.` };
  }

  // Pega a primeira empresa do grupo ativa como padrão — Legado não
  // tem contrato formal ligado a uma empresa específica ainda; o
  // financeiro pode reatribuir depois se precisar.
  const empresa = await prisma.empresaGrupo.findFirst({ where: { ativo: true }, select: { id: true } });
  if (!empresa) return { erro: "Nenhuma empresa do grupo ativa cadastrada — configuração incompleta." };

  const enderecoEntrega = [empreendimento.endereco, empreendimento.cidade, empreendimento.estado]
    .filter(Boolean)
    .join(", ") || "Endereço não informado";

  const resultado = await criarRemessaAction({
    empresaId: empresa.id,
    clienteId: empreendimento.clienteId,
    empreendimentoId: input.empreendimentoId,
    enderecoEntrega,
    dataEntregaPrevista: input.dataEntregaPrevista,
    observacoes: `Remessa Legado — ${input.referencia}`,
    itens: [
      {
        tipologiaId: kitLegado.tipologiaId,
        tipologiaNome: `Legado — ${LABEL_KIT[input.kit]}`,
        tipoKit: input.kit,
        descricao: input.referencia,
        unidade: "kit",
        quantidadePrevista: input.quantidade,
      },
    ],
  });

  if ("erro" in resultado) return resultado;
  return { ok: true, id: resultado.id, numero: resultado.numero };
}

/**
 * "Entregue após ERP" — soma dos itens de Remessa Legado já
 * despachados/concluídos, por kit. Fonte de verdade separada de
 * Produzido (OrdemProducao) e de Histórico (KitLegado).
 */
export async function buscarEntreguePosErpPorKit(empreendimentoId: string): Promise<Record<string, number>> {
  const itens = await prisma.itemRemessa.findMany({
    where: {
      remessa: {
        empreendimentoId,
        status: { in: ["TOTALMENTE_EXPEDIDA", "EM_TRANSITO", "ENTREGUE", "PARCIALMENTE_EXPEDIDA"] as never },
      },
    },
    select: { tipoKit: true, quantidadePrevista: true },
  });

  const resultado: Record<string, number> = {};
  for (const item of itens) {
    resultado[item.tipoKit] = (resultado[item.tipoKit] ?? 0) + item.quantidadePrevista;
  }
  return resultado;
}
