"use server";

import { revalidatePath } from "next/cache";

import { empreendimentoSchema } from "@/features/empreendimentos/schemas/empreendimento-schema";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { prisma } from "@/infra/db/prisma/client";
import { CriarEmpreendimentoUseCase } from "@/core/empreendimentos/use-cases/criar-empreendimento";
import { AtualizarEmpreendimentoUseCase } from "@/core/empreendimentos/use-cases/atualizar-empreendimento";
import { exigirPermissao, temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { Empreendimento } from "@/core/empreendimentos/entities/empreendimento";
import { criarContaReceberAutomatica } from "@/features/financeiro/lib/criar-conta-receber-automatica";
import { verificarGateOrcamentacao, verificarGateNegociacao } from "@/features/empreendimentos/lib/gates-status";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();
const clienteRepo = new ClientePrismaRepository();
const estruturaFisicaRepo = new EstruturaFisicaPrismaRepository();
const timelineRepo = new TimelinePrismaRepository();

/** Converte string "YYYY-MM-DD" do <input type="date"> em Date, ou null se vazio. */
function parseDataOpcional(valor?: string): Date | null {
  if (!valor) return null;
  const data = new Date(`${valor}T00:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

export async function criarEmpreendimento(
  formData: unknown
): Promise<{ id: string } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_CRIAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const parsed = empreendimentoSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos. Revise os campos destacados." };
  }
  const v = parsed.data;

  try {
    const endereco = [v.logradouro, v.numero].filter(Boolean).join(", ");

    // Busca o nome da construtora pelo clienteId — não precisa mais ser
    // digitado manualmente no formulário
    const clienteSelecionado = await clienteRepo.findById(v.clienteId);
    const nomeConstrutora = clienteSelecionado?.nomeFantasia ?? clienteSelecionado?.razaoSocial ?? "";

    const useCase = new CriarEmpreendimentoUseCase(
      empreendimentoRepo,
      clienteRepo,
      estruturaFisicaRepo
    );
    const empreendimento = await useCase.executar({
      nome: v.nome,
      clienteId: v.clienteId,
      cidade: v.cidade,
      estado: v.estado,
      endereco,
      tipo: v.tipo as Empreendimento["tipo"],
      construtora: nomeConstrutora,
      incorporadora: v.incorporadora || null,
      tipoEstrutura: (v.tipoEstrutura || null) as Empreendimento["tipoEstrutura"],
      kitEletrico: v.kitEletrico,
      kitHidraulico: v.kitHidraulico,
      kitQdc: v.kitQdc,
      tiposInstalacao: v.tiposInstalacao ?? [],
      responsavelComercial: nomeConstrutora,
      // "" => null: o use case então herda o tier do cliente.
      // Defesa em profundidade: sem permissão, força null mesmo que o
      // formulário (manipulado) tenha enviado um valor — o use case então
      // herda automaticamente o tier do cliente selecionado.
      tier: (await temPermissao(PERMISSOES.EMPREENDIMENTO_DEFINIR_TIER)) && v.tier
        ? Number(v.tier)
        : null,
      criterioPrecificacao: (v.criterioPrecificacao || null) as Empreendimento["criterioPrecificacao"],
      dataPrevistaInicio: parseDataOpcional(v.dataPrevistaInicio),
      dataPrevistaEntrega: parseDataOpcional(v.dataPrevistaEntrega),
      responsavelComercialUserId: null,
      responsavelEngenhariaUserId: null,
      responsavelOrcamentacaoUserId: null,
      observacoes: v.observacoes || null,
      temHall: v.temHall,
      hallTipo: v.hallTipo,
      hallQuantidadeEspecifica: v.hallQuantidadeEspecifica ?? null,
      torres: v.torres,
      tipologias: v.tipologias.map((t) => ({
        nome: t.nome,
        areaPrivativa: t.areaPrivativa ?? null,
        quantidadeUnidades: t.quantidadeUnidades,
        descricao: t.descricao || null,
      })),
    });

    revalidatePath("/empreendimentos");
    return { id: empreendimento.id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao criar empreendimento." };
  }
}

export async function atualizarEmpreendimento(
  id: string,
  formData: unknown
): Promise<{ id: string } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const parsed = empreendimentoSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos. Revise os campos destacados." };
  }
  const v = parsed.data;

  try {
    const endereco = [v.logradouro, v.numero].filter(Boolean).join(", ");

    // Defesa em profundidade: sem permissão, preserva o tier já salvo.
    const podeDefinirTier = await temPermissao(PERMISSOES.EMPREENDIMENTO_DEFINIR_TIER);
    let tierNumerico: number | null;
    if (podeDefinirTier) {
      tierNumerico = v.tier ? Number(v.tier) : null;
    } else {
      const atual = await empreendimentoRepo.findById(id);
      tierNumerico = atual?.tier ?? null;
    }

    const useCase = new AtualizarEmpreendimentoUseCase(
      empreendimentoRepo,
      clienteRepo,
      estruturaFisicaRepo
    );
    const empreendimento = await useCase.executar(id, {
      nome: v.nome,
      clienteId: v.clienteId,
      cidade: v.cidade,
      estado: v.estado,
      endereco,
      tipo: v.tipo as Empreendimento["tipo"],
      construtora: v.construtora,
      incorporadora: v.incorporadora || null,
      tipoEstrutura: (v.tipoEstrutura || null) as Empreendimento["tipoEstrutura"],
      kitEletrico: v.kitEletrico,
      kitHidraulico: v.kitHidraulico,
      kitQdc: v.kitQdc,
      tiposInstalacao: v.tiposInstalacao ?? [],
      responsavelComercial: v.responsavelComercial,
      status: v.statusOportunidade as Empreendimento["status"],
      tier: tierNumerico,
      criterioPrecificacao: (v.criterioPrecificacao || null) as Empreendimento["criterioPrecificacao"],
      responsavelEngenhariaUserId: v.responsavelEngenharia || null,
      responsavelOrcamentacaoUserId: v.responsavelOrcamentacao || null,
      observacoes: v.observacoes || null,
      temHall: v.temHall,
      hallTipo: v.hallTipo,
      hallQuantidadeEspecifica: v.hallQuantidadeEspecifica ?? null,
      torres: v.torres,
      tipologias: v.tipologias.map((t) => ({
        nome: t.nome,
        areaPrivativa: t.areaPrivativa ?? null,
        quantidadeUnidades: t.quantidadeUnidades,
        descricao: t.descricao || null,
      })),
    });

    revalidatePath("/empreendimentos");
    revalidatePath(`/empreendimentos/${id}`);
    return { id: empreendimento.id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao atualizar empreendimento." };
  }
}

/**
 * Ação rápida usada na página de detalhe (StatusChangeButton) — atualiza
 * SOMENTE o status e registra automaticamente um evento na timeline.
 */
export async function mudarStatusEmpreendimento(
  id: string,
  novoStatus: Empreendimento["status"]
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  try {
    const empreendimentoAtual = await empreendimentoRepo.findById(id);
    if (!empreendimentoAtual) return { erro: "Empreendimento não encontrado." };

    // Gate: só entra em Negociação se TODA tipologia contratada tiver os
    // levantamentos necessários validados (senão a proposta comercial sai
    // com quantitativo errado/incompleto) E se a revisão mais recente do
    // orçamento já teve a proposta comercial gerada.
    if (novoStatus === "NEGOCIACAO") {
      const gateLevantamentos = await verificarGateOrcamentacao(
        id,
        empreendimentoAtual.kitEletrico,
        empreendimentoAtual.kitHidraulico
      );
      if ("erro" in gateLevantamentos) return gateLevantamentos;

      const gateNegociacao = await verificarGateNegociacao(id);
      if ("erro" in gateNegociacao) return gateNegociacao;
    }

    // Gate: se o empreendimento contratou kit Hidráulico, não pode ir pra
    // Concluído sem o Levantamento Hidráulico validado em toda tipologia
    // que precisa dele — "Hall" fica de fora dessa exigência (área comum
    // não tem ponto hidráulico, por natureza).
    if (novoStatus === "CONCLUIDO" && empreendimentoAtual.kitHidraulico) {
      const tipologias = await prisma.tipologia.findMany({
        where: { empreendimentoId: id, nome: { not: "Hall" } },
        select: {
          id: true,
          nome: true,
          levantamentosHidraulicos: { select: { status: true } },
        },
      });
      const semHidraulicaValidada = tipologias.filter(
        (t) => !t.levantamentosHidraulicos.some((l) => l.status === "VALIDADO")
      );
      if (semHidraulicaValidada.length > 0) {
        return {
          erro: `Falta validar o Levantamento Hidráulico de: ${semHidraulicaValidada.map((t) => t.nome).join(", ")}.`,
        };
      }
    }

    const useCase = new AtualizarEmpreendimentoUseCase(
      empreendimentoRepo,
      clienteRepo,
      estruturaFisicaRepo
    );
    await useCase.executar(id, { status: novoStatus });

    // Registra a mudança de status na timeline automaticamente
    await timelineRepo.criarEvento({
      empreendimentoId: id,
      tipo: "MUDANCA_STATUS",
      titulo: `Status alterado para ${novoStatus}`,
      usuarioId: sessao.user.id,
      meta: JSON.stringify({
        statusAnterior: empreendimentoAtual.status,
        statusNovo: novoStatus,
      }),
    });

    // Alguém pode empurrar manualmente pra Contratado sem passar pelo
    // fluxo de decisão do cliente (ex: negociação feita por telefone,
    // registrada só depois) — a Conta a Receber precisa nascer de
    // qualquer jeito que o empreendimento chegue lá.
    if (novoStatus === "CONTRATADO") {
      await criarContaReceberAutomatica(id);
    }

    // BUG REAL corrigido: reverter o status pra ANTES de Contratado (ex:
    // "desfazer" um contrato, ou voltar etapas depois de excluir
    // orçamento/levantamento) deixava as Contas a Receber (Entrada +
    // Remessas) órfãs no banco — elas continuavam contando na projeção
    // de Receita Prevista do Financeiro/Diretoria mesmo depois do
    // empreendimento "não ter mais orçamento nenhum". Isso limpa as que
    // ainda não foram recebidas (as já recebidas ficam, são histórico
    // real de dinheiro que já entrou).
    const ORDEM_PIPELINE: Empreendimento["status"][] = [
      "PROSPECCAO",
      "COMERCIAL",
      "ORCAMENTACAO",
      "NEGOCIACAO",
      "CONTRATADO",
      "SUPRIMENTOS",
      "PRODUCAO",
      "CONCLUIDO",
    ];
    const idxAnterior = ORDEM_PIPELINE.indexOf(empreendimentoAtual.status);
    const idxNovo = ORDEM_PIPELINE.indexOf(novoStatus);
    const voltouParaAntesDoContrato =
      idxAnterior >= ORDEM_PIPELINE.indexOf("CONTRATADO") && idxNovo >= 0 && idxNovo < ORDEM_PIPELINE.indexOf("CONTRATADO");
    if (voltouParaAntesDoContrato) {
      const removidas = await prisma.contaReceber.deleteMany({
        where: { empreendimentoId: id, recebido: false },
      });
      if (removidas.count > 0) {
        await timelineRepo.criarEvento({
          empreendimentoId: id,
          tipo: "ANOTACAO",
          titulo: `${removidas.count} conta(s) a receber (ainda não recebidas) removida(s) automaticamente`,
          descricao: "Empreendimento voltou pra antes de Contratado — projeções antigas não fazem mais sentido.",
          usuarioId: sessao.user.id,
        });
      }
    }

    revalidatePath("/empreendimentos");
    revalidatePath(`/empreendimentos/${id}`);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao mudar status." };
  }
}

/**
 * Adiciona uma anotação manual na timeline do empreendimento.
 */
export async function adicionarAnotacao(
  empreendimentoId: string,
  texto: string
): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_ANOTAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!texto.trim()) return { erro: "A anotação não pode estar vazia." };

  try {
    await timelineRepo.criarEvento({
      empreendimentoId,
      tipo: "ANOTACAO",
      titulo: "Anotação",
      descricao: texto.trim(),
      usuarioId: sessao.user.id,
    });

    revalidatePath(`/empreendimentos/${empreendimentoId}`);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao salvar anotação." };
  }
}

/**
 * [CORREÇÃO C2/C3.1] Arquiva um empreendimento — soft-delete idempotente
 * via `excluidoEm`/`excluidoPorId`. Substitui o antigo `excluirEmpreendimento`
 * (que fazia exclusão física real). Nada é apagado: documentos, financeiro,
 * orçamentos e histórico continuam intactos, só saem das listagens
 * operacionais. Reversível via `restaurarEmpreendimento`.
 */
export async function arquivarEmpreendimento(
  id: string
): Promise<{ ok: true } | { erro: string }> {
  let usuarioId: string;
  try {
    const session = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EXCLUIR);
    usuarioId = session.user.id;
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  try {
    await empreendimentoRepo.arquivar(id, usuarioId);
    revalidatePath("/empreendimentos");
    revalidatePath(`/empreendimentos/${id}`);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao arquivar empreendimento." };
  }
}

/**
 * [CORREÇÃO C2/C3.1] Restaura um empreendimento arquivado — idempotente.
 * Volta a aparecer nas listagens operacionais normalmente.
 */
export async function restaurarEmpreendimento(
  id: string
): Promise<{ ok: true } | { erro: string }> {
  let usuarioId: string;
  try {
    const session = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EXCLUIR);
    usuarioId = session.user.id;
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  try {
    await empreendimentoRepo.restaurar(id, usuarioId);
    revalidatePath("/empreendimentos");
    revalidatePath(`/empreendimentos/${id}`);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao restaurar empreendimento." };
  }
}
