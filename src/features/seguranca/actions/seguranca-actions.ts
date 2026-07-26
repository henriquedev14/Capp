"use server";

import { prisma } from "@/infra/db/prisma/client";

/**
 * Busca os últimos 200 eventos de log de segurança + contadores de
 * bloqueios/falhas nas últimas 24h — extraído da página em 2.2.1 (item
 * A4).
 */
export async function buscarLogSeguranca() {
  const [logs, totalBloqueios24h, totalFalhas24h] = await Promise.all([
    prisma.logSeguranca.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { usuario: { select: { nome: true } } },
    }),
    prisma.logSeguranca.count({
      where: { tipo: "LOGIN_BLOQUEADO", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.logSeguranca.count({
      where: { tipo: "LOGIN_FALHA", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);
  return { logs, totalBloqueios24h, totalFalhas24h };
}
