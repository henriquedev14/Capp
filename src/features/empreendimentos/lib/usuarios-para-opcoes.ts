import type { PersonOption } from "@/components/form/person-form-field";
import type { Usuario } from "@/core/auth/entities/usuario";

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Converte uma lista de Usuario (entidade de domínio) no formato que o
 * PersonFormField espera. Filtra automaticamente usuários inativos —
 * eles não devem aparecer como opção de responsável em novos vínculos.
 */
export function usuariosParaOpcoes(usuarios: Usuario[]): PersonOption[] {
  return usuarios
    .filter((u) => u.ativo)
    .map((u) => ({
      value: u.id,
      label: u.nome,
      role: u.papeis[0]?.nome,
      initials: iniciais(u.nome),
    }));
}
