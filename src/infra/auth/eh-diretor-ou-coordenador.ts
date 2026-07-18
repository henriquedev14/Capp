import { getServerSession } from "next-auth";
import { authOptions } from "@/infra/auth/auth-options.full";

/**
 * Checagem por NOME de papel — Diretor OU Coordenador. Diferente de
 * ehGestorSenior() (que é Diretor/Admin, usado pra "quebrar o fluxo
 * normal" tipo pular etapa de status ou regenerar proposta já travada).
 *
 * Esse aqui é específico pra autorizar reverter/reimportar um Levantamento
 * Elétrico já validado pelo gestor — uma ação sensível o bastante pra não
 * deixar qualquer um fazer, mas que faz sentido pro Coordenador também
 * autorizar (ele é quem aprova o orçamento no dia a dia), não só o Diretor.
 */
export async function ehDiretorOuCoordenador(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const papeis = session?.user?.papeis ?? [];
  const normalizados = papeis.map((p) =>
    p
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
  );
  return normalizados.some((p) => p.includes("diretor") || p.includes("coordena") || p.includes("admin"));
}
