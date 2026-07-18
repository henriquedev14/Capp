"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fornecedorSchema } from "@/features/fornecedores/schemas/fornecedor-schema";
import { FornecedorPrismaRepository } from "@/infra/db/prisma/repositories/fornecedor-prisma-repository";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { TipoFornecedor } from "@/core/fornecedores/entities/fornecedor";

const repo = new FornecedorPrismaRepository();

export async function criarFornecedor(
  formData: unknown
): Promise<{ erro: string; detalhes?: unknown } | undefined> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_CRIAR);

  const parsed = fornecedorSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos", detalhes: parsed.error.flatten() };
  }

  const { contatos, numero, ...dados } = parsed.data;
  const logradouroCompleto =
    [dados.logradouro, numero].filter(Boolean).join(", ") || undefined;

  const existe = await repo.existsByCnpj(dados.cnpj);
  if (existe) {
    return { erro: "Já existe um fornecedor cadastrado com este CNPJ." };
  }

  const fornecedor = await repo.create({
    ...dados,
    logradouro: logradouroCompleto,
    tipos: dados.tipos as TipoFornecedor[],
    ativo: true,
    contatos: contatos.map((c, i) => ({
      id: c.id,
      nome: c.nome,
      cargo: c.cargo ?? null,
      telefone: c.telefone ?? null,
      email: c.email || null,
      principal: i === 0 ? true : c.principal,
    })),
  });

  revalidatePath("/fornecedores");
  redirect(`/fornecedores/${fornecedor.id}`);
}

export async function atualizarFornecedor(
  id: string,
  formData: unknown
): Promise<{ erro: string; detalhes?: unknown } | undefined> {
  await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);

  const parsed = fornecedorSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos", detalhes: parsed.error.flatten() };
  }

  const { contatos, numero, ...dados } = parsed.data;
  const logradouroCompleto =
    [dados.logradouro, numero].filter(Boolean).join(", ") || undefined;

  const existe = await repo.existsByCnpj(dados.cnpj, id);
  if (existe) {
    return { erro: "Já existe outro fornecedor com este CNPJ." };
  }

  await repo.update(id, {
    ...dados,
    logradouro: logradouroCompleto,
    tipos: dados.tipos as TipoFornecedor[],
  });

  await repo.sincronizarContatos(
    id,
    contatos.map((c, i) => ({
      ...(c.id ? { id: c.id } : {}),
      nome: c.nome,
      cargo: c.cargo ?? null,
      telefone: c.telefone ?? null,
      email: c.email || null,
      principal: i === 0 ? true : c.principal,
    }))
  );

  revalidatePath(`/fornecedores/${id}`);
  revalidatePath("/fornecedores");
  redirect(`/fornecedores/${id}`);
}

export async function inativarFornecedor(id: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.FORNECEDOR_ATIVAR_INATIVAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await repo.inativar(id);
  revalidatePath(`/fornecedores/${id}`);
  revalidatePath("/fornecedores");
  return { ok: true };
}

export async function reativarFornecedor(id: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.FORNECEDOR_ATIVAR_INATIVAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  await repo.reativar(id);
  revalidatePath(`/fornecedores/${id}`);
  revalidatePath("/fornecedores");
  return { ok: true };
}

// ── Contatos individuais (gestão direta no perfil, fora do formulário) ──────

export async function adicionarContatoFornecedor(
  fornecedorId: string,
  contato: { nome: string; cargo?: string; telefone?: string; email?: string; principal: boolean }
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  if (!contato.nome.trim()) return { erro: "Informe o nome do contato." };
  try {
    await repo.adicionarContato(fornecedorId, {
      nome: contato.nome.trim(),
      cargo: contato.cargo || null,
      telefone: contato.telefone || null,
      email: contato.email || null,
      principal: contato.principal,
    });
    revalidatePath(`/fornecedores/${fornecedorId}`);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao adicionar contato." };
  }
}

export async function atualizarContatoFornecedor(
  fornecedorId: string,
  contatoId: string,
  contato: { nome: string; cargo?: string; telefone?: string; email?: string; principal: boolean }
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  try {
    await repo.atualizarContato(contatoId, {
      nome: contato.nome.trim(),
      cargo: contato.cargo || null,
      telefone: contato.telefone || null,
      email: contato.email || null,
      principal: contato.principal,
    });
    revalidatePath(`/fornecedores/${fornecedorId}`);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao atualizar contato." };
  }
}

export async function excluirContatoFornecedor(
  fornecedorId: string,
  contatoId: string
): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.FORNECEDOR_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }
  try {
    await repo.excluirContato(contatoId);
    revalidatePath(`/fornecedores/${fornecedorId}`);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao excluir contato." };
  }
}
