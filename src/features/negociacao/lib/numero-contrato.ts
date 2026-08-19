import { prisma } from "@/infra/db/prisma/client";
import type { Prisma } from "@/generated/prisma";

/**
 * Gera o próximo número de contrato (CTR-ANO-NNNN) por MAX+1.
 *
 * IMPORTANTE: quando chamado dentro de um fluxo que grava o Contrato,
 * SEMPRE passe o `tx` da mesma transação (idealmente Serializable) —
 * senão a leitura do "último número" fica fora do isolamento e duas
 * chamadas concorrentes podem calcular o mesmo número. Achado numa
 * auditoria em 19/08/2026: `registrarGanhaEGerarContrato` fazia essa
 * leitura fora de transação nenhuma.
 */
export async function proximoNumeroContrato(
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `CTR-${ano}-`;

  const ultimo = await db.contrato.findFirst({
    where: { numero: { startsWith: prefixo } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const proximo = ultimo ? parseInt(ultimo.numero.slice(prefixo.length), 10) + 1 : 1;

  return `${prefixo}${String(proximo).padStart(4, "0")}`;
}
