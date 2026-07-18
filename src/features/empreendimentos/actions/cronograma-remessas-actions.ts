"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

/**
 * Lista os pavimentos do empreendimento (via Torre direto ou via Bloco
 * dentro de Torre) com a data prevista de remessa que já foi cadastrada,
 * pra tela onde o Comercial preenche/ajusta o cronograma.
 */
export async function listarPavimentosParaCronograma(empreendimentoId: string) {
  const torres = await prisma.torre.findMany({
    where: { empreendimentoId },
    include: {
      pavimentos: { select: { id: true, nome: true, ordem: true, dataPrevistaRemessa: true }, orderBy: { ordem: "asc" } },
      blocos: {
        include: {
          pavimentos: { select: { id: true, nome: true, ordem: true, dataPrevistaRemessa: true }, orderBy: { ordem: "asc" } },
        },
        orderBy: { ordem: "asc" },
      },
    },
    orderBy: { ordem: "asc" },
  });

  const linhas: { pavimentoId: string; localNome: string; pavimentoNome: string; dataPrevistaRemessa: string | null }[] = [];
  for (const torre of torres) {
    for (const p of torre.pavimentos) {
      linhas.push({
        pavimentoId: p.id,
        localNome: torre.nome,
        pavimentoNome: p.nome,
        dataPrevistaRemessa: p.dataPrevistaRemessa ? p.dataPrevistaRemessa.toISOString().slice(0, 10) : null,
      });
    }
    for (const bloco of torre.blocos) {
      for (const p of bloco.pavimentos) {
        linhas.push({
          pavimentoId: p.id,
          localNome: `${torre.nome} — ${bloco.nome}`,
          pavimentoNome: p.nome,
          dataPrevistaRemessa: p.dataPrevistaRemessa ? p.dataPrevistaRemessa.toISOString().slice(0, 10) : null,
        });
      }
    }
  }
  return linhas;
}

export async function atualizarDataPrevistaRemessa(
  pavimentoId: string,
  data: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  // Busca o empreendimento ANTES de atualizar, pra poder checar arquivamento.
  const pavimentoAtual = await prisma.pavimento.findUnique({
    where: { id: pavimentoId },
    select: {
      torre: { select: { empreendimentoId: true } },
      bloco: { select: { torre: { select: { empreendimentoId: true } } } },
    },
  });
  if (!pavimentoAtual) return { erro: "Pavimento não encontrado." };

  const empreendimentoIdParaGuarda =
    pavimentoAtual.torre?.empreendimentoId ?? pavimentoAtual.bloco?.torre.empreendimentoId;
  if (empreendimentoIdParaGuarda) {
    const guardaArquivado = await verificarEmpreendimentoAtivo(empreendimentoIdParaGuarda);
    if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };
  }

  const pavimento = await prisma.pavimento.update({
    where: { id: pavimentoId },
    data: { dataPrevistaRemessa: data ? new Date(data) : null },
    select: {
      torre: { select: { empreendimentoId: true } },
      bloco: { select: { torre: { select: { empreendimentoId: true } } } },
    },
  });

  const empreendimentoId = pavimento.torre?.empreendimentoId ?? pavimento.bloco?.torre.empreendimentoId;
  if (empreendimentoId) {
    revalidatePath(`/empreendimentos/${empreendimentoId}`);
    // Se já existe uma Conta a Receber (REMESSA) pra esse pavimento sem
    // data prevista ainda, aproveita e já preenche — evita o Financeiro
    // ter que fazer isso de novo manualmente depois que o Comercial já
    // cadastrou aqui.
    await prisma.contaReceber.updateMany({
      where: { pavimentoId, tipo: "REMESSA", dataPrevista: null, dataEnvio: null },
      data: { dataPrevista: data ? new Date(data) : null },
    });
    revalidatePath("/financeiro/contas-a-receber");
  }

  return { ok: true };
}
