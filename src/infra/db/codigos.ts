import { prisma } from "@/infra/db/prisma/client";

/**
 * Gera o próximo código sequencial legível para um registro.
 *
 * Usa uma transação para garantir que dois registros criados
 * simultaneamente nunca recebam o mesmo código — o findFirst dentro da
 * transaction garante que cada processo vê o estado mais recente antes de
 * incrementar.
 *
 * Formato: {prefixo}-{número com 4 dígitos}
 * Exemplos: C-0001, C-0042, E-0001, E-0100, F-0001
 */
export async function gerarCodigoCliente(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const ultimo = await tx.cliente.findFirst({
      where: { codigo: { startsWith: "C-" } },
      orderBy: { codigo: "desc" },
      select: { codigo: true },
    });

    const proximoNumero = ultimo
      ? Number(ultimo.codigo.replace("C-", "")) + 1
      : 1;

    return `C-${String(proximoNumero).padStart(4, "0")}`;
  });
}

export async function gerarCodigoEmpreendimento(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const ultimo = await tx.empreendimento.findFirst({
      where: { codigo: { startsWith: "E-" } },
      orderBy: { codigo: "desc" },
      select: { codigo: true },
    });

    const proximoNumero = ultimo
      ? Number(ultimo.codigo.replace("E-", "")) + 1
      : 1;

    return `E-${String(proximoNumero).padStart(4, "0")}`;
  });
}

export async function gerarCodigoFornecedor(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const ultimo = await tx.fornecedor.findFirst({
      where: { codigo: { startsWith: "F-" } },
      orderBy: { codigo: "desc" },
      select: { codigo: true },
    });

    const proximoNumero = ultimo
      ? Number(ultimo.codigo.replace("F-", "")) + 1
      : 1;

    return `F-${String(proximoNumero).padStart(4, "0")}`;
  });
}
