import { prisma } from "@/infra/db/prisma/client";
import type {
  UsuarioRepository,
  CriarUsuarioInput,
  AtualizarUsuarioInput,
} from "@/core/auth/repositories/usuario-repository";
import type { Usuario, Papel } from "@/core/auth/entities/usuario";

/**
 * Implementação concreta de UsuarioRepository usando Prisma + PostgreSQL.
 * Resolve papéis e permissões em uma única consulta (include profundo),
 * já entregando ao domínio o formato "achatado" que ele consome.
 */
export class UsuarioPrismaRepository implements UsuarioRepository {
  async findById(id: string): Promise<Usuario | null> {
    const record = await prisma.usuario.findUnique({
      where: { id },
      include: USUARIO_INCLUDE,
    });
    return record ? toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const record = await prisma.usuario.findUnique({
      where: { email },
      include: USUARIO_INCLUDE,
    });
    return record ? toDomain(record) : null;
  }

  async findMany(): Promise<Usuario[]> {
    const records = await prisma.usuario.findMany({
      include: USUARIO_INCLUDE,
      orderBy: { nome: "asc" },
    });
    return records.map(toDomain);
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const count = await prisma.usuario.count({
      where: { email, ...(excludeId && { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  async create(data: CriarUsuarioInput): Promise<Usuario> {
    const record = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash: data.senhaHash,
        ativo: true,
        papeis: {
          create: data.papeisIds.map((papelId) => ({ papelId })),
        },
      },
      include: USUARIO_INCLUDE,
    });
    return toDomain(record);
  }

  async update(id: string, data: AtualizarUsuarioInput): Promise<Usuario> {
    if (data.papeisIds !== undefined) {
      // Substitui os papéis por completo — mais simples e previsível do
      // que calcular diff, mesmo padrão usado em Torres/Tipologias.
      await prisma.usuarioPapel.deleteMany({ where: { usuarioId: id } });
      if (data.papeisIds.length > 0) {
        await prisma.usuarioPapel.createMany({
          data: data.papeisIds.map((papelId) => ({ usuarioId: id, papelId })),
        });
      }
    }

    const record = await prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
      include: USUARIO_INCLUDE,
    });
    return toDomain(record);
  }

  async atualizarSenha(id: string, senhaHash: string): Promise<void> {
    await prisma.usuario.update({ where: { id }, data: { senhaHash } });
  }

  async inativar(id: string): Promise<void> {
    await prisma.usuario.update({ where: { id }, data: { ativo: false } });
  }

  async reativar(id: string): Promise<void> {
    await prisma.usuario.update({ where: { id }, data: { ativo: true } });
  }

  async excluir(id: string): Promise<void> {
    await prisma.usuario.delete({ where: { id } });
  }
}

const USUARIO_INCLUDE = {
  papeis: {
    include: {
      papel: {
        include: {
          permissoes: { include: { permissao: true } },
        },
      },
    },
  },
} as const;

interface UsuarioComPapeisRecord {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  precisaTrocarSenha: boolean;
  duploFatorAtivo: boolean;
  duploFatorObrigatorio: boolean;
  createdAt: Date;
  updatedAt: Date;
  papeis: Array<{
    papel: {
      id: string;
      nome: string;
      descricao: string | null;
      permissoes: Array<{ permissao: { chave: string } }>;
    };
  }>;
}

function toDomain(record: UsuarioComPapeisRecord): Usuario {
  const papeis: Papel[] = record.papeis.map(({ papel }) => ({
    id: papel.id,
    nome: papel.nome,
    descricao: papel.descricao,
    permissoes: papel.permissoes.map((p) => p.permissao.chave),
  }));

  return {
    id: record.id,
    nome: record.nome,
    email: record.email,
    ativo: record.ativo,
    precisaTrocarSenha: record.precisaTrocarSenha,
    duploFatorAtivo: record.duploFatorAtivo,
    duploFatorObrigatorio: record.duploFatorObrigatorio,
    papeis,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
