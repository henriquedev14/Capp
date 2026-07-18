"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clienteSchema } from "@/features/clientes/schemas/cliente-schema";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao, temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const repo = new ClientePrismaRepository();

/**
 * Cria uma nova construtora. Em caso de sucesso, redireciona para a
 * página de detalhe (não retorna `id` — o redirect() já cuida da
 * navegação). Só retorna algo quando há erro de validação ou CNPJ
 * duplicado, para o formulário exibir a mensagem.
 */
export async function criarCliente(
  formData: unknown
): Promise<{ erro: string; detalhes?: unknown } | undefined> {
  const parsed = clienteSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos", detalhes: parsed.error.flatten() };
  }

  // parsed.data já vem com cnpj/telefone/cep limpos (sem máscara) — o
  // Zod aplica .transform(apenasDigitos) na validação, então não é
  // necessário (nem correto) limpar de novo aqui.
  const { contatos, numero, tier, ...dados } = parsed.data;

  // Concatena logradouro + número em um único campo (o banco não tem coluna
  // separada para número — isso evita migration e mantém o modelo simples).
  const logradouroCompleto = [dados.logradouro, numero].filter(Boolean).join(", ") || undefined;

  // Tier chega como string do <Select> ("0".."3" ou "") — persiste como número.
  // Defesa em profundidade: mesmo que o campo apareça desabilitado na UI,
  // um request manipulado não deve conseguir setar o tier sem permissão.
  const podeDefinirTier = await temPermissao(PERMISSOES.CLIENTE_DEFINIR_TIER);
  const tierNumerico = podeDefinirTier && tier ? Number(tier) : null;

  const existe = await repo.existsByCnpj(dados.cnpj);
  if (existe) {
    return { erro: "Já existe uma construtora cadastrada com este CNPJ." };
  }

  const cliente = await repo.create({
    ...dados,
    logradouro: logradouroCompleto,
    tier: tierNumerico,
    ativo: true,
  });

  if (contatos.length > 0) {
    await prisma.clienteContato.createMany({
      data: contatos.map((c, i) => ({
        clienteId: cliente.id,
        nome: c.nome,
        cargo: c.cargo ?? null,
        telefone: c.telefone ?? null,
        email: c.email || null,
        principal: i === 0 || c.principal,
      })),
    });
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

/**
 * Atualiza uma construtora existente. Mesmo padrão de retorno de
 * criarCliente — só retorna algo em caso de erro, já que o sucesso
 * redireciona.
 */
export async function atualizarCliente(
  id: string,
  formData: unknown
): Promise<{ erro: string; detalhes?: unknown } | undefined> {
  const parsed = clienteSchema.safeParse(formData);
  if (!parsed.success) {
    return { erro: "Dados inválidos", detalhes: parsed.error.flatten() };
  }

  const { contatos, numero, tier, ...dados } = parsed.data;
  const logradouroCompleto = [dados.logradouro, numero].filter(Boolean).join(", ") || undefined;

  // Defesa em profundidade: sem permissão, preserva o tier já salvo em vez
  // de aceitar o valor enviado (que na UI aparece como campo readonly, mas
  // um request manipulado poderia tentar alterar).
  const podeDefinirTier = await temPermissao(PERMISSOES.CLIENTE_DEFINIR_TIER);
  let tierNumerico: number | null;
  if (podeDefinirTier) {
    tierNumerico = tier ? Number(tier) : null;
  } else {
    const atual = await repo.findById(id);
    tierNumerico = atual?.tier ?? null;
  }

  const existe = await repo.existsByCnpj(dados.cnpj, id);
  if (existe) {
    return { erro: "Já existe outra construtora com este CNPJ." };
  }

  await repo.update(id, { ...dados, logradouro: logradouroCompleto, tier: tierNumerico });

  await prisma.clienteContato.deleteMany({ where: { clienteId: id } });
  if (contatos.length > 0) {
    await prisma.clienteContato.createMany({
      data: contatos.map((c, i) => ({
        clienteId: id,
        nome: c.nome,
        cargo: c.cargo ?? null,
        telefone: c.telefone ?? null,
        email: c.email || null,
        principal: i === 0 || c.principal,
      })),
    });
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

/**
 * Inativa uma construtora — restrito a Admin e usuários com a permissão
 * cliente:ativar_inativar (ex: papel Diretor criado pelo Admin).
 */
export async function inativarCliente(id: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.CLIENTE_ATIVAR_INATIVAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const cliente = await repo.findById(id);
  if (!cliente) return { erro: "Construtora não encontrada." };
  if (!cliente.ativo) return { erro: "Esta construtora já está inativa." };

  await repo.inativar(id);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}

/**
 * Reativa uma construtora inativa — mesma permissão que inativar.
 */
export async function reativarCliente(id: string): Promise<{ ok: true } | { erro: string }> {
  try {
    await exigirPermissao(PERMISSOES.CLIENTE_ATIVAR_INATIVAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const cliente = await repo.findById(id);
  if (!cliente) return { erro: "Construtora não encontrada." };
  if (cliente.ativo) return { erro: "Esta construtora já está ativa." };

  await repo.reativar(id);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}
