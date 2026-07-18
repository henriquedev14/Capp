"use server";

import { authenticator } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";

import { authOptions } from "@/infra/auth/auth-options.full";
import { prisma } from "@/infra/db/prisma/client";
import { registrarLogSeguranca } from "@/infra/auth/log-seguranca";

/**
 * Gera um segredo novo (ainda não salvo) e o QR code correspondente, pra
 * escanear no Google Authenticator/Authy. Só é gravado no banco depois
 * que confirmarAtivacao2FA validar um código de verdade gerado a partir
 * dele — evita ativar 2FA "pela metade" com um segredo que a pessoa não
 * chegou a salvar no app autenticador.
 */
export async function iniciarConfiguracao2FA(): Promise<
  { ok: true; secret: string; qrCodeDataUrl: string } | { erro: string }
> {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) return { erro: "Sessão expirada." };

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(sessao.user.email ?? "usuario", "ConstruApp", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { ok: true, secret, qrCodeDataUrl };
}

export async function confirmarAtivacao2FA(
  secret: string,
  codigo: string
): Promise<{ ok: true } | { erro: string }> {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) return { erro: "Sessão expirada." };

  const valido = authenticator.check(codigo.trim(), secret);
  if (!valido) {
    return { erro: "Código incorreto — confira o horário do seu celular e tente de novo." };
  }

  await prisma.usuario.update({
    where: { id: sessao.user.id },
    data: { duploFatorAtivo: true, duploFatorSecreto: secret },
  });

  await registrarLogSeguranca({
    tipo: "DUPLO_FATOR_ATIVADO",
    email: sessao.user.email ?? "desconhecido",
    usuarioId: sessao.user.id,
  });

  return { ok: true };
}

export async function desativar2FA(senhaAtual: string): Promise<{ ok: true } | { erro: string }> {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) return { erro: "Sessão expirada." };

  const registro = await prisma.usuario.findUnique({
    where: { id: sessao.user.id },
    select: { senhaHash: true, email: true, duploFatorObrigatorio: true },
  });
  if (!registro?.senhaHash) return { erro: "Usuário não encontrado." };

  // Se o Admin marcou 2FA como obrigatório pra este usuário, ele NÃO pode
  // se autodesativar — só o Admin desmarcando a exigência (na tela de
  // Pessoas) libera isso de novo. Sem essa checagem, a exigência do Admin
  // não valia nada — bastava a pessoa saber a própria senha.
  if (registro.duploFatorObrigatorio) {
    return {
      erro: "Seu 2FA é obrigatório (exigido por um Administrador) e não pode ser desativado por você mesmo. Peça pra um Admin remover essa exigência primeiro.",
    };
  }

  const senhaValida = await bcrypt.compare(senhaAtual, registro.senhaHash);
  if (!senhaValida) return { erro: "Senha incorreta." };

  await prisma.usuario.update({
    where: { id: sessao.user.id },
    data: { duploFatorAtivo: false, duploFatorSecreto: null },
  });

  await registrarLogSeguranca({
    tipo: "DUPLO_FATOR_DESATIVADO",
    email: registro.email,
    usuarioId: sessao.user.id,
  });

  return { ok: true };
}

export async function usuarioTemDuploFatorAtivo(): Promise<boolean> {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) return false;
  const registro = await prisma.usuario.findUnique({
    where: { id: sessao.user.id },
    select: { duploFatorAtivo: true },
  });
  return registro?.duploFatorAtivo ?? false;
}

/**
 * Checagem usada SÓ pelo formulário de login, pra decidir se mostra o
 * campo de código antes de chamar o signIn de verdade. Não cria sessão,
 * não registra nada no log — a validação (e o log) que vale de verdade
 * acontece dentro do authorize() do NextAuth, quando o signIn é chamado
 * de fato. Devolve `precisa: false` tanto pra "credenciais erradas"
 * quanto pra "2FA desligado" — a distinção não importa aqui, o próximo
 * passo (signIn) trata os dois corretamente.
 */
export async function verificarPrecisaDuploFator(
  email: string,
  senha: string
): Promise<{ precisa: boolean }> {
  const registro = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { senhaHash: true, ativo: true, duploFatorAtivo: true },
  });
  if (!registro?.senhaHash || !registro.ativo) return { precisa: false };

  const senhaValida = await bcrypt.compare(senha, registro.senhaHash);
  if (!senhaValida) return { precisa: false };

  return { precisa: registro.duploFatorAtivo };
}
