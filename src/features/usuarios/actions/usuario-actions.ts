"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { usuarioSchema, redefinirSenhaSchema } from "@/features/usuarios/schemas/usuario-schema";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const repo = new UsuarioPrismaRepository();

export async function criarUsuario(
  formData: unknown
): Promise<{ erro: string; detalhes?: unknown } | undefined> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_USUARIOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const parsed = usuarioSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos", detalhes: parsed.error.flatten() };
  }
  const v = parsed.data;

  if (!v.senha) {
    return { erro: "Defina uma senha para o novo usuário." };
  }

  const existe = await repo.existsByEmail(v.email);
  if (existe) {
    return { erro: "Já existe um usuário cadastrado com este e-mail." };
  }

  const senhaHash = await bcrypt.hash(v.senha, 10);
  const usuario = await repo.create({
    nome: v.nome,
    email: v.email,
    senhaHash,
    papeisIds: v.papeisIds,
  });

  revalidatePath("/pessoas");
  redirect(`/pessoas/${usuario.id}/editar`);
}

export async function atualizarUsuario(
  id: string,
  formData: unknown
): Promise<{ erro: string; detalhes?: unknown } | undefined> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_USUARIOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const parsed = usuarioSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos", detalhes: parsed.error.flatten() };
  }
  const v = parsed.data;

  const existe = await repo.existsByEmail(v.email, id);
  if (existe) {
    return { erro: "Já existe outro usuário cadastrado com este e-mail." };
  }

  // Proteção: ninguém consegue tirar o papel "Admin" de um usuário se
  // isso deixar o sistema sem nenhum Admin ativo — trava mesmo que o
  // request tenha sido manipulado para burlar o checkbox desabilitado na UI.
  const usuarioAtual = await repo.findById(id);
  const tinhaAdmin = usuarioAtual?.papeis.some((p) => p.nome === "Admin") ?? false;
  const papelAdmin = usuarioAtual?.papeis.find((p) => p.nome === "Admin");
  if (tinhaAdmin && papelAdmin && !v.papeisIds.includes(papelAdmin.id)) {
    const todosUsuarios = await repo.findMany();
    const outrosAdminsAtivos = todosUsuarios.filter(
      (u) => u.id !== id && u.ativo && u.papeis.some((p) => p.nome === "Admin")
    );
    if (outrosAdminsAtivos.length === 0) {
      return {
        erro: "Não é possível remover o papel Admin deste usuário — ele é o único Admin ativo do sistema.",
      };
    }
  }

  await repo.update(id, {
    nome: v.nome,
    email: v.email,
    papeisIds: v.papeisIds,
  });

  revalidatePath(`/pessoas/${id}/editar`);
  revalidatePath("/pessoas");
  redirect("/pessoas");
}

export async function redefinirSenha(
  id: string,
  formData: unknown
): Promise<{ erro: string } | { ok: true }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_USUARIOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const parsed = redefinirSenhaSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Senha inválida — mínimo de 8 caracteres." };
  }

  const senhaHash = await bcrypt.hash(parsed.data.novaSenha, 10);
  await repo.atualizarSenha(id, senhaHash);
  // Reset feito por Admin sempre força a pessoa a trocar de novo no
  // próximo login — ela não deveria continuar usando a senha temporária
  // que o Admin definiu.
  await prisma.usuario.update({ where: { id }, data: { precisaTrocarSenha: true } });
  return { ok: true };
}

export async function alternarDuploFatorObrigatorio(
  id: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_USUARIOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const atual = await prisma.usuario.findUnique({
    where: { id },
    select: { duploFatorObrigatorio: true },
  });
  if (!atual) return { erro: "Usuário não encontrado." };

  await prisma.usuario.update({
    where: { id },
    data: { duploFatorObrigatorio: !atual.duploFatorObrigatorio },
  });

  return { ok: true };
}

export async function inativarUsuario(id: string): Promise<{ ok: true } | { erro: string }> {
  try {
    const sessao = await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_USUARIOS);
    if (sessao.user.id === id) {
      return { erro: "Você não pode inativar seu próprio usuário." };
    }
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  // Proteção: nunca deixar o sistema sem nenhum Admin ativo.
  const alvo = await repo.findById(id);
  const ehAdmin = alvo?.papeis.some((p) => p.nome === "Admin") ?? false;
  if (ehAdmin) {
    const todosUsuarios = await repo.findMany();
    const outrosAdminsAtivos = todosUsuarios.filter(
      (u) => u.id !== id && u.ativo && u.papeis.some((p) => p.nome === "Admin")
    );
    if (outrosAdminsAtivos.length === 0) {
      return { erro: "Não é possível inativar este usuário — ele é o único Admin ativo do sistema." };
    }
  }

  await repo.inativar(id);
  revalidatePath("/pessoas");
  return { ok: true };
}

export async function reativarUsuario(id: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_USUARIOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await repo.reativar(id);
  revalidatePath("/pessoas");
  return { ok: true };
}

/**
 * Exclui definitivamente o cadastro do usuário. Diferente de inativar
 * (que só bloqueia login, mantendo histórico visível), isso remove o
 * registro por completo — sessões e vínculos de papel somem junto
 * (cascade), mas orçamentos/propostas/documentos que ele criou continuam
 * existindo normalmente, só perdem a referência de autoria (fica null).
 */
export async function excluirUsuario(id: string): Promise<{ ok: true } | { erro: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.ADMIN_GERENCIAR_USUARIOS);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (sessao.user.id === id) {
    return { erro: "Você não pode excluir seu próprio usuário." };
  }

  // Mesma proteção do inativar: nunca deixar o sistema sem nenhum Admin ativo.
  const alvo = await repo.findById(id);
  if (!alvo) return { erro: "Usuário não encontrado." };

  const ehAdmin = alvo.papeis.some((p) => p.nome === "Admin");
  if (ehAdmin) {
    const todosUsuarios = await repo.findMany();
    const outrosAdminsAtivos = todosUsuarios.filter(
      (u) => u.id !== id && u.ativo && u.papeis.some((p) => p.nome === "Admin")
    );
    if (outrosAdminsAtivos.length === 0) {
      return { erro: "Não é possível excluir este usuário — ele é o único Admin ativo do sistema." };
    }
  }

  await repo.excluir(id);
  revalidatePath("/pessoas");
  return { ok: true };
}
