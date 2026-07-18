import { getServerSession } from "next-auth";
import { authOptions } from "@/infra/auth/auth-options.full";

/**
 * Checagem por NOME de papel (não por permissão granular) — usada
 * especificamente para os poucos lugares onde só Diretor/Admin podem
 * "quebrar o fluxo normal": pular etapas de status, gerar proposta de novo
 * depois de já ter sido gerada, etc.
 *
 * Isso é intencionalmente diferente de exigirPermissao/temPermissao (que
 * checam permissões granulares tipo "empreendimento:editar"). Aqui a regra
 * de negócio é literalmente "papel X ou Y", não uma permissão configurável
 * por role — então checamos o nome do papel direto.
 */
export async function ehGestorSenior(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const papeis = session?.user?.papeis ?? [];
  const normalizados = papeis.map((p) =>
    p
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
  );
  return normalizados.some((p) => p.includes("diretor") || p.includes("admin"));
}
