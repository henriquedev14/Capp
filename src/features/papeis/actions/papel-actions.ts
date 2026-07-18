"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { papelSchema } from "@/features/papeis/schemas/papel-schema";
import { PapelPrismaRepository } from "@/infra/db/prisma/repositories/papel-prisma-repository";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const repo = new PapelPrismaRepository();

export async function criarPapel(
  formData: unknown
): Promise<{ erro: string; detalhes?: unknown } | undefined> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_PAPEIS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const parsed = papelSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos", detalhes: parsed.error.flatten() };
  }
  const v = parsed.data;

  const existe = await repo.existsByNome(v.nome);
  if (existe) {
    return { erro: "Já existe um papel com este nome." };
  }

  await repo.create({ nome: v.nome, descricao: v.descricao || null, permissoes: v.permissoes });

  revalidatePath("/papeis");
  redirect("/papeis");
}

export async function atualizarPapel(
  id: string,
  formData: unknown
): Promise<{ erro: string; detalhes?: unknown } | undefined> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_PAPEIS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const parsed = papelSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos", detalhes: parsed.error.flatten() };
  }
  const v = parsed.data;

  const existe = await repo.existsByNome(v.nome, id);
  if (existe) {
    return { erro: "Já existe outro papel com este nome." };
  }

  try {
    await repo.update(id, { nome: v.nome, descricao: v.descricao || null, permissoes: v.permissoes });
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao atualizar papel." };
  }

  revalidatePath("/papeis");
  redirect("/papeis");
}

export async function excluirPapel(id: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_PAPEIS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  try {
    await repo.excluir(id);
    revalidatePath("/papeis");
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao excluir papel." };
  }
}
