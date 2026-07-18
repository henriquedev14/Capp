import { getServerSession } from "next-auth";

import { authOptions } from "@/infra/auth/auth-options.full";
import type { PermissaoChave } from "@/core/auth/permissions";
import { registrarLogSeguranca } from "@/infra/auth/log-seguranca";

/**
 * Busca a sessão atual no contexto de uma Server Action / Server Component
 * e garante que o usuário está autenticado e tem a permissão exigida.
 *
 * Lança erro se não houver sessão válida ou se a permissão não estiver
 * entre as permissões resolvidas do usuário (já "achatadas" no JWT pelos
 * callbacks de auth-options.full.ts — não faz query ao banco aqui).
 *
 * Uso em Server Actions:
 *   const sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_CRIAR);
 */
export async function exigirPermissao(permissao: PermissaoChave) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!session.user.ativo) {
    throw new Error("Usuário inativo. Contate o administrador.");
  }

  if (!session.user.permissoes?.includes(permissao)) {
    await registrarLogSeguranca({
      tipo: "PERMISSAO_NEGADA",
      email: session.user.email ?? "desconhecido",
      usuarioId: session.user.id,
      detalhes: `Permissão exigida: ${permissao}`,
    });
    throw new Error("Você não tem permissão para realizar esta ação.");
  }

  return session;
}

/**
 * Verificação "leve" de permissão, sem lançar erro — usada em Server
 * Components para decidir se um campo/botão deve aparecer habilitado ou
 * não (ex: campo de Tier, restrito a Admin/Diretor). Nunca usar para
 * proteger uma Server Action — para isso, sempre exigirPermissao().
 */
export async function temPermissao(permissao: PermissaoChave): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.ativo) return false;
  return session.user.permissoes?.includes(permissao) ?? false;
}
