"use server";

import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { authOptions } from "@/infra/auth/auth-options.full";
import { prisma } from "@/infra/db/prisma/client";
import { registrarLogSeguranca } from "@/infra/auth/log-seguranca";
import { validarSenhaForte } from "@/core/auth/validar-senha";

interface Resultado {
  erro?: string;
  ok?: boolean;
}

export async function trocarSenhaObrigatoria(
  senhaAtual: string,
  novaSenha: string
): Promise<Resultado> {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) {
    return { erro: "Sessão expirada. Faça login novamente." };
  }

  const validacao = validarSenhaForte(novaSenha);
  if (!validacao.valida) {
    return { erro: validacao.erro };
  }
  if (novaSenha === senhaAtual) {
    return { erro: "A nova senha precisa ser diferente da atual." };
  }

  const registro = await prisma.usuario.findUnique({
    where: { id: sessao.user.id },
    select: { senhaHash: true, email: true },
  });
  if (!registro?.senhaHash) {
    return { erro: "Usuário não encontrado." };
  }

  const senhaAtualValida = await bcrypt.compare(senhaAtual, registro.senhaHash);
  if (!senhaAtualValida) {
    return { erro: "Senha atual incorreta." };
  }

  const novoHash = await bcrypt.hash(novaSenha, 10);
  await prisma.usuario.update({
    where: { id: sessao.user.id },
    data: { senhaHash: novoHash, precisaTrocarSenha: false },
  });

  await registrarLogSeguranca({
    tipo: "SENHA_RESET_CONCLUIDO",
    email: registro.email,
    usuarioId: sessao.user.id,
    detalhes: "Troca obrigatória de senha (primeiro login ou reset por Admin).",
  });

  return { ok: true };
}
