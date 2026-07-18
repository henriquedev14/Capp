"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/infra/auth/auth-options.full";
import { registrarLogSeguranca } from "@/infra/auth/log-seguranca";

export async function registrarLogoutPorInatividade(): Promise<void> {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user?.email) return;
  await registrarLogSeguranca({
    tipo: "LOGOUT_INATIVIDADE",
    email: sessao.user.email,
    usuarioId: sessao.user.id,
  });
}
