import { prisma } from "@/infra/db/prisma/client";

/**
 * Gera o próximo número de RODADA de cotação, no formato COT-YYYY-NNNN.
 * Esse é o número único que o usuário vê — cada Cotacao individual
 * (uma por fornecedor) pertence a uma Rodada e não expõe mais o
 * próprio número na tela.
 */
export async function proximoNumeroRodada(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `COT-${ano}-`;

  const ultima = await prisma.rodadaCotacao.findFirst({
    where: { numero: { startsWith: prefixo } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const proximo = ultima ? parseInt(ultima.numero.slice(prefixo.length), 10) + 1 : 1;

  return `${prefixo}${String(proximo).padStart(4, "0")}`;
}
