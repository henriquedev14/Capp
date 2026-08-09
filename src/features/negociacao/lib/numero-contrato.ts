import { prisma } from "@/infra/db/prisma/client";

export async function proximoNumeroContrato(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `CTR-${ano}-`;

  const ultimo = await prisma.contrato.findFirst({
    where: { numero: { startsWith: prefixo } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const proximo = ultimo ? parseInt(ultimo.numero.slice(prefixo.length), 10) + 1 : 1;

  return `${prefixo}${String(proximo).padStart(4, "0")}`;
}
