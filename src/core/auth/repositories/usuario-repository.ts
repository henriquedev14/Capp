import type { Usuario } from "@/core/auth/entities/usuario";

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  senhaHash: string;
  papeisIds: string[];
}

export interface AtualizarUsuarioInput {
  nome?: string;
  email?: string;
  ativo?: boolean;
  papeisIds?: string[];
}

/**
 * Contrato de persistência de Usuario. O `core/` conhece apenas esta
 * interface — a implementação real (Prisma) vive em infra/.
 */
export interface UsuarioRepository {
  findById(id: string): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  findMany(): Promise<Usuario[]>;
  existsByEmail(email: string, excludeId?: string): Promise<boolean>;
  create(data: CriarUsuarioInput): Promise<Usuario>;
  update(id: string, data: AtualizarUsuarioInput): Promise<Usuario>;
  atualizarSenha(id: string, senhaHash: string): Promise<void>;
  inativar(id: string): Promise<void>;
  reativar(id: string): Promise<void>;
  excluir(id: string): Promise<void>;
}
