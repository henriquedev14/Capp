"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/infra/db/prisma/client";
import { registrarLogSeguranca } from "@/infra/auth/log-seguranca";
import { enviarEmail } from "@/infra/email/enviar-email";
import { validarSenhaForte } from "@/core/auth/validar-senha";

const VALIDADE_TOKEN_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function solicitarResetSenha(
  email: string
): Promise<{ ok: true; avisoSemEmail?: boolean }> {
  const emailLimpo = email.toLowerCase().trim();
  const usuario = await prisma.usuario.findUnique({
    where: { email: emailLimpo },
    select: { id: true, nome: true, ativo: true },
  });

  if (!usuario || !usuario.ativo) {
    return { ok: true };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + VALIDADE_TOKEN_MS);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { tokenResetSenha: hashToken(token), tokenResetSenhaExpira: expira },
  });

  await registrarLogSeguranca({
    tipo: "SENHA_RESET_SOLICITADO",
    email: emailLimpo,
    usuarioId: usuario.id,
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/redefinir-senha/${token}`;

  const { enviado } = await enviarEmail({
    para: emailLimpo,
    assunto: "Redefinir sua senha — ConstruApp",
    corpoTexto: `Olá, ${usuario.nome}.\n\nRecebemos um pedido pra redefinir sua senha. Clique no link abaixo (válido por 1 hora):\n\n${link}\n\nSe você não pediu isso, ignore este e-mail.`,
  });

  return { ok: true, avisoSemEmail: !enviado };
}

export async function validarTokenResetSenha(
  token: string
): Promise<{ valido: boolean; nome?: string }> {
  const usuario = await prisma.usuario.findFirst({
    where: { tokenResetSenha: hashToken(token) },
    select: { nome: true, tokenResetSenhaExpira: true },
  });
  if (!usuario || !usuario.tokenResetSenhaExpira || usuario.tokenResetSenhaExpira < new Date()) {
    return { valido: false };
  }
  return { valido: true, nome: usuario.nome };
}

export async function redefinirSenhaComToken(
  token: string,
  novaSenha: string
): Promise<{ ok: true } | { erro: string }> {
  const validacao = validarSenhaForte(novaSenha);
  if (!validacao.valida) {
    return { erro: validacao.erro };
  }

  const usuario = await prisma.usuario.findFirst({
    where: { tokenResetSenha: hashToken(token) },
    select: { id: true, email: true, tokenResetSenhaExpira: true },
  });
  if (!usuario || !usuario.tokenResetSenhaExpira || usuario.tokenResetSenhaExpira < new Date()) {
    return { erro: "Link inválido ou expirado. Solicite um novo." };
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senhaHash,
      precisaTrocarSenha: false,
      tokenResetSenha: null,
      tokenResetSenhaExpira: null,
    },
  });

  await registrarLogSeguranca({
    tipo: "SENHA_RESET_CONCLUIDO",
    email: usuario.email,
    usuarioId: usuario.id,
    detalhes: "Reset via link de e-mail.",
  });

  return { ok: true };
}
