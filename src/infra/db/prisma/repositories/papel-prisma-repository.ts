import { prisma } from "@/infra/db/prisma/client";
import type {
  PapelRepository,
  PapelGestao,
  CriarPapelInput,
  AtualizarPapelInput,
} from "@/core/auth/repositories/papel-repository";

// O papel "Admin" é semeado automaticamente com todas as permissões e
// nunca pode ser editado ou excluído pela tela — é a garantia de que
// sempre existe pelo menos um usuário com acesso total ao sistema.
const NOME_PAPEL_PROTEGIDO = "Admin";

const PAPEL_INCLUDE = {
  permissoes: { include: { permissao: true } },
  usuarios: { select: { usuarioId: true } },
} as const;

interface PapelRecord {
  id: string;
  nome: string;
  descricao: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissoes: Array<{ permissao: { chave: string } }>;
  usuarios: Array<{ usuarioId: string }>;
}

function toDomain(record: PapelRecord): PapelGestao {
  return {
    id: record.id,
    nome: record.nome,
    descricao: record.descricao,
    permissoes: record.permissoes.map((p) => p.permissao.chave),
    totalUsuarios: record.usuarios.length,
    protegido: record.nome === NOME_PAPEL_PROTEGIDO,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PapelPrismaRepository implements PapelRepository {
  async findAll(): Promise<PapelGestao[]> {
    const records = await prisma.papel.findMany({
      include: PAPEL_INCLUDE,
      orderBy: { nome: "asc" },
    });
    return records.map(toDomain);
  }

  async findById(id: string): Promise<PapelGestao | null> {
    const record = await prisma.papel.findUnique({ where: { id }, include: PAPEL_INCLUDE });
    return record ? toDomain(record) : null;
  }

  async existsByNome(nome: string, excludeId?: string): Promise<boolean> {
    const count = await prisma.papel.count({
      where: { nome, ...(excludeId && { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  async create(data: CriarPapelInput): Promise<PapelGestao> {
    const permissoes = await prisma.permissao.findMany({
      where: { chave: { in: data.permissoes } },
      select: { id: true },
    });

    const record = await prisma.papel.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        permissoes: {
          create: permissoes.map((p) => ({ permissaoId: p.id })),
        },
      },
      include: PAPEL_INCLUDE,
    });
    return toDomain(record);
  }

  async update(id: string, data: AtualizarPapelInput): Promise<PapelGestao> {
    const atual = await prisma.papel.findUnique({ where: { id } });
    if (atual?.nome === NOME_PAPEL_PROTEGIDO) {
      throw new Error('O papel "Admin" não pode ser editado — é protegido pelo sistema.');
    }

    if (data.permissoes !== undefined) {
      const permissoes = await prisma.permissao.findMany({
        where: { chave: { in: data.permissoes } },
        select: { id: true },
      });
      await prisma.papelPermissao.deleteMany({ where: { papelId: id } });
      if (permissoes.length > 0) {
        await prisma.papelPermissao.createMany({
          data: permissoes.map((p) => ({ papelId: id, permissaoId: p.id })),
        });
      }
    }

    const record = await prisma.papel.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
      },
      include: PAPEL_INCLUDE,
    });
    return toDomain(record);
  }

  async excluir(id: string): Promise<void> {
    const atual = await prisma.papel.findUnique({
      where: { id },
      include: { usuarios: { select: { usuarioId: true } } },
    });
    if (!atual) return;
    if (atual.nome === NOME_PAPEL_PROTEGIDO) {
      throw new Error('O papel "Admin" não pode ser excluído — é protegido pelo sistema.');
    }
    if (atual.usuarios.length > 0) {
      throw new Error(
        `Este papel está atribuído a ${atual.usuarios.length} usuário(s) — remova a atribuição antes de excluir.`
      );
    }
    await prisma.papel.delete({ where: { id } });
  }
}
