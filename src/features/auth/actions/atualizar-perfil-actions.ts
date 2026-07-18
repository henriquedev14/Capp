"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/infra/auth/auth-options.full";
import { prisma } from "@/infra/db/prisma/client";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

/**
 * Qualquer usuário logado pode editar o próprio cargo/telefone — não exige
 * nenhuma permissão especial (não é dado sensível, e ninguém mais pode
 * editar por você). Usados como "Associado" na Proposta Comercial.
 */
export async function atualizarMeuPerfil(cargo: string, telefone: string): Promise<Resultado> {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) return { erro: "Sessão expirada." };

  await prisma.usuario.update({
    where: { id: sessao.user.id },
    data: {
      cargo: cargo.trim() || null,
      telefone: telefone.trim() || null,
    },
  });

  revalidatePath("/perfil");
  return { ok: true };
}
