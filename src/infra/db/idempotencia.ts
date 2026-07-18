import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma";

/**
 * Idempotência genérica — não é específica de Expedição, qualquer módulo
 * pode reutilizar. Chave+operação+empresa são criadas e concluídas DENTRO
 * da mesma transação da operação principal: se a operação falhar, a linha
 * inteira (incluindo o registro de idempotência) reverte junto — nunca
 * fica uma chave "PROCESSING" travada indefinidamente.
 *
 * Uso:
 *   const resultado = await comIdempotencia(
 *     { empresaId, operacao: "criar_remessa", chave, payload: input },
 *     async (tx) => {
 *       // ... trabalho real dentro da transação
 *       return { id: novaRemessa.id };
 *     }
 *   );
 */

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export interface ResultadoIdempotente<T> {
  resultado: T;
  reaproveitado: boolean; // true se veio de uma chamada anterior já concluída
}

export class ChaveIdempotenciaConflitante extends Error {
  constructor() {
    super("Essa chave de idempotência já foi usada com um conteúdo diferente.");
    this.name = "ChaveIdempotenciaConflitante";
  }
}

export async function comIdempotencia<T>(
  prisma: PrismaClient,
  params: { empresaId: string; operacao: string; chave: string; payload: unknown },
  trabalho: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<ResultadoIdempotente<T>> {
  const requestHash = hashPayload(params.payload);

  // Checagem rápida FORA de transação nova — se já foi concluída com o
  // mesmo conteúdo, devolve o resultado guardado sem reprocessar nada.
  const existente = await prisma.idempotencyKey.findUnique({
    where: { empresaId_operacao_chave: { empresaId: params.empresaId, operacao: params.operacao, chave: params.chave } },
  });

  if (existente) {
    if (existente.requestHash !== requestHash) {
      throw new ChaveIdempotenciaConflitante();
    }
    if (existente.status === "COMPLETED") {
      return { resultado: existente.resposta as T, reaproveitado: true };
    }
    if (existente.status === "PROCESSING") {
      // Outra requisição com a mesma chave está em andamento agora mesmo
      // (janela muito curta, já que tudo roda numa única transação curta).
      throw new Error("Essa operação já está sendo processada. Aguarde um instante e tente de novo.");
    }
    // status === "FAILED": permite tentar de novo, cai pro fluxo normal abaixo.
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.idempotencyKey.upsert({
        where: { empresaId_operacao_chave: { empresaId: params.empresaId, operacao: params.operacao, chave: params.chave } },
        create: {
          empresaId: params.empresaId,
          operacao: params.operacao,
          chave: params.chave,
          requestHash,
          status: "PROCESSING",
        },
        update: { status: "PROCESSING", requestHash },
      });

      const resultado = await trabalho(tx);

      await tx.idempotencyKey.update({
        where: { empresaId_operacao_chave: { empresaId: params.empresaId, operacao: params.operacao, chave: params.chave } },
        data: { status: "COMPLETED", resposta: resultado as Prisma.InputJsonValue, completedAt: new Date() },
      });

      return { resultado, reaproveitado: false };
    },
    { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 }
  );
}
