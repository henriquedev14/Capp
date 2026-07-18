import { prisma } from "@/infra/db/prisma/client";

/**
 * Gera o próximo número de cotação no formato COT-YYYY-NNNN.
 * A sequência é global por ano (não por fornecedor nem por orçamento).
 *
 * NOTA: usa max(numero) LIKE por ano — best-effort. Se duas requisições
 * gerarem cotações simultaneamente, o unique constraint no schema
 * (Cotacao.numero @unique) protege contra colisão real: no pior caso,
 * uma das duas falha e o operador tenta de novo. Não usamos uma tabela
 * de counters porque volume é baixo (poucas cotações/dia).
 */
export async function proximoNumeroCotacao(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `COT-${ano}-`;

  const ultima = await prisma.cotacao.findFirst({
    where: { numero: { startsWith: prefixo } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const proximo = ultima
    ? parseInt(ultima.numero.slice(prefixo.length), 10) + 1
    : 1;

  return `${prefixo}${String(proximo).padStart(4, "0")}`;
}
