import { prisma } from "@/infra/db/prisma/client";
import {
  verificarEmpreendimentoNaoArquivado,
  type ResultadoGuardaEmpreendimento,
} from "@/core/empreendimentos/use-cases/guarda-empreendimento-arquivado";

/**
 * [CORREÇÃO C2/C3.1] Ponto único de verificação — qualquer action que
 * precise bloquear uma operação em empreendimento arquivado chama esta
 * função, em vez de reimplementar a checagem de `excluidoEm` sozinha.
 *
 * Aceita opcionalmente um client de transação (`tx`), pra poder ser usada
 * dentro de `prisma.$transaction(...)` quando a action já está numa.
 */
export async function verificarEmpreendimentoAtivo(
  empreendimentoId: string,
  tx: { empreendimento: { findUnique: typeof prisma.empreendimento.findUnique } } = prisma
): Promise<ResultadoGuardaEmpreendimento> {
  const empreendimento = await tx.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: { excluidoEm: true },
  });
  return verificarEmpreendimentoNaoArquivado(empreendimento);
}
