"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { TipoReferenciaEngenharia } from "@/features/engenharia/lib/controle-produtividade";

// Gestão de carga/prazo é uma ação de Coordenação. O executor precisa ter
// responsabilidade de Engenharia, mas não ganha permissão para redistribuir
// a fila apenas por executar levantamentos.
const PERMISSAO = PERMISSOES.DASHBOARD_VER_COORDENACAO;

async function exigirControle(tipo: TipoReferenciaEngenharia, referenciaId: string) {
  return prisma.engenhariaControle.findUnique({
    where: { referenciaTipo_referenciaId: { referenciaTipo: tipo, referenciaId } },
  });
}

function revalidarAnalytics() {
  revalidatePath("/dashboard");
  revalidatePath("/produtividade");
}

export async function atribuirExecutorPacoteEngenharia(
  tipo: TipoReferenciaEngenharia,
  referenciaId: string,
  executorId: string | null
): Promise<{ ok: true } | { erro: string }> {
  try {
    const sessao = await exigirPermissao(PERMISSAO);
    const controle = await exigirControle(tipo, referenciaId);
    if (!controle) return { erro: "Pacote ainda não está instrumentado. Abra o levantamento uma vez e tente novamente." };
    if (executorId) {
      const existe = await prisma.usuario.findFirst({
        where: {
          id: executorId,
          ativo: true,
          papeis: {
            some: {
              papel: {
                permissoes: { some: { permissao: { chave: PERMISSOES.RESPONSABILIDADE_ENGENHARIA } } },
              },
            },
          },
        },
        select: { id: true },
      });
      if (!existe) return { erro: "Executor inválido, inativo ou sem responsabilidade de Engenharia." };
    }
    await prisma.$transaction([
      prisma.engenhariaControle.update({ where: { id: controle.id }, data: { executorId } }),
      prisma.engenhariaControleEvento.create({
        data: { controleId: controle.id, tipo: "ATRIBUICAO", meta: JSON.stringify({ executorId }), registradoPorId: sessao.user.id },
      }),
    ]);
    revalidarAnalytics();
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível atribuir o executor." };
  }
}

export async function definirPrazoPacoteEngenharia(
  tipo: TipoReferenciaEngenharia,
  referenciaId: string,
  prazoIso: string | null
): Promise<{ ok: true } | { erro: string }> {
  try {
    const sessao = await exigirPermissao(PERMISSAO);
    const controle = await exigirControle(tipo, referenciaId);
    if (!controle) return { erro: "Pacote ainda não está instrumentado." };
    const prazo = prazoIso ? new Date(prazoIso) : null;
    if (prazo && Number.isNaN(prazo.getTime())) return { erro: "Prazo inválido." };
    await prisma.$transaction([
      prisma.engenhariaControle.update({ where: { id: controle.id }, data: { prazo } }),
      prisma.engenhariaControleEvento.create({
        data: { controleId: controle.id, tipo: "PRAZO", meta: JSON.stringify({ prazo: prazo?.toISOString() ?? null }), registradoPorId: sessao.user.id },
      }),
    ]);
    revalidarAnalytics();
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível definir o prazo." };
  }
}

export async function bloquearPacoteEngenharia(
  tipo: TipoReferenciaEngenharia,
  referenciaId: string,
  motivo: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    const sessao = await exigirPermissao(PERMISSAO);
    if (!motivo.trim()) return { erro: "Informe o motivo do bloqueio." };
    const controle = await exigirControle(tipo, referenciaId);
    if (!controle) return { erro: "Pacote ainda não está instrumentado." };
    if (controle.bloqueadoEm) return { erro: "Este pacote já está bloqueado." };
    const agora = new Date();
    await prisma.$transaction([
      prisma.engenhariaControle.update({
        where: { id: controle.id },
        data: { bloqueadoEm: agora, motivoBloqueio: motivo.trim() },
      }),
      prisma.engenhariaControleEvento.create({
        data: { controleId: controle.id, tipo: "BLOQUEIO", motivo: motivo.trim(), registradoPorId: sessao.user.id, ocorridoEm: agora },
      }),
    ]);
    revalidarAnalytics();
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível bloquear o pacote." };
  }
}

export async function retomarPacoteEngenharia(
  tipo: TipoReferenciaEngenharia,
  referenciaId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    const sessao = await exigirPermissao(PERMISSAO);
    const controle = await exigirControle(tipo, referenciaId);
    if (!controle) return { erro: "Pacote ainda não está instrumentado." };
    if (!controle.bloqueadoEm) return { erro: "Este pacote não está bloqueado." };
    const minutos = Math.max(0, Math.round((Date.now() - controle.bloqueadoEm.getTime()) / 60000));
    const agora = new Date();
    await prisma.$transaction([
      prisma.engenhariaControle.update({
        where: { id: controle.id },
        data: {
          bloqueadoEm: null,
          motivoBloqueio: null,
          minutosBloqueados: { increment: minutos },
        },
      }),
      prisma.engenhariaControleEvento.create({
        data: { controleId: controle.id, tipo: "RETOMADA", meta: JSON.stringify({ minutosBloqueados: minutos }), registradoPorId: sessao.user.id, ocorridoEm: agora },
      }),
    ]);
    revalidarAnalytics();
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível retomar o pacote." };
  }
}
