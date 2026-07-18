import { prisma } from "@/infra/db/prisma/client";
import { gerarCodigoFornecedor } from "@/infra/db/codigos";
import type { FornecedorRepository, FornecedorFiltros } from "@/core/fornecedores/repositories/fornecedor-repository";
import type { Fornecedor, FornecedorContato, FornecedorResumo } from "@/core/fornecedores/entities/fornecedor";

const CONTATO_INCLUDE = {
  contatos: { orderBy: { principal: "desc" as const } },
} as const;

export class FornecedorPrismaRepository implements FornecedorRepository {
  async findById(id: string): Promise<Fornecedor | null> {
    const r = await prisma.fornecedor.findUnique({
      where: { id },
      include: CONTATO_INCLUDE,
    });
    return r ? toDomain(r) : null;
  }

  async findMany(filtros?: FornecedorFiltros): Promise<FornecedorResumo[]> {
    const records = await prisma.fornecedor.findMany({
      where: {
        ...(filtros?.ativo !== undefined && { ativo: filtros.ativo }),
        ...(filtros?.tipo && { tipos: { has: filtros.tipo } }),
        ...(filtros?.busca && {
          OR: [
            { razaoSocial: { contains: filtros.busca, mode: "insensitive" } },
            { nomeFantasia: { contains: filtros.busca, mode: "insensitive" } },
            { cnpj: { contains: filtros.busca } },
          ],
        }),
      },
      include: { _count: { select: { contatos: true } } },
      orderBy: { razaoSocial: "asc" },
    });

    return records.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      razaoSocial: r.razaoSocial,
      nomeFantasia: r.nomeFantasia,
      cnpj: r.cnpj,
      cidade: r.cidade,
      estado: r.estado,
      ativo: r.ativo,
      tipos: r.tipos as Fornecedor["tipos"],
      totalContatos: r._count.contatos,
    }));
  }

  async findAtivos() {
    const records = await prisma.fornecedor.findMany({
      where: { ativo: true },
      select: { id: true, razaoSocial: true, nomeFantasia: true, tipos: true },
      orderBy: { razaoSocial: "asc" },
    });
    return records.map((r) => ({
      ...r,
      tipos: r.tipos as Fornecedor["tipos"],
    }));
  }

  async existsByCnpj(cnpj: string, excludeId?: string): Promise<boolean> {
    const count = await prisma.fornecedor.count({
      where: { cnpj, ...(excludeId && { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  async create(
    data: Omit<Fornecedor, "id" | "codigo" | "contatos" | "createdAt" | "updatedAt"> & {
      contatos?: Array<Omit<FornecedorContato, "id" | "fornecedorId" | "createdAt" | "updatedAt">>;
    }
  ): Promise<Fornecedor> {
    const codigo = await gerarCodigoFornecedor();
    const { contatos, ...resto } = data;
    const r = await prisma.fornecedor.create({
      data: {
        codigo,
        razaoSocial: resto.razaoSocial,
        nomeFantasia: resto.nomeFantasia,
        cnpj: resto.cnpj,
        email: resto.email,
        telefone: resto.telefone,
        logradouro: resto.logradouro,
        cidade: resto.cidade,
        estado: resto.estado,
        cep: resto.cep,
        observacoes: resto.observacoes,
        ativo: resto.ativo,
        tipos: resto.tipos,
        ...(contatos && contatos.length > 0 && {
          contatos: { createMany: { data: contatos } },
        }),
      },
      include: CONTATO_INCLUDE,
    });
    return toDomain(r);
  }

  async update(
    id: string,
    data: Partial<Omit<Fornecedor, "id" | "codigo" | "contatos" | "createdAt" | "updatedAt">>
  ): Promise<Fornecedor> {
    const r = await prisma.fornecedor.update({
      where: { id },
      data,
      include: CONTATO_INCLUDE,
    });
    return toDomain(r);
  }

  /** Recria todos os contatos (delete + createMany). */
  async sincronizarContatos(
    fornecedorId: string,
    contatos: Array<Omit<FornecedorContato, "fornecedorId" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    await prisma.$transaction([
      prisma.fornecedorContato.deleteMany({ where: { fornecedorId } }),
      ...(contatos.length > 0
        ? [
            prisma.fornecedorContato.createMany({
              data: contatos.map(({ id: _id, ...c }) => ({ ...c, fornecedorId })),
            }),
          ]
        : []),
    ]);
  }

  async inativar(id: string): Promise<void> {
    await prisma.fornecedor.update({ where: { id }, data: { ativo: false } });
  }

  async reativar(id: string): Promise<void> {
    await prisma.fornecedor.update({ where: { id }, data: { ativo: true } });
  }

  // ── Contatos individuais ──────────────────────────────────────────────────

  async adicionarContato(
    fornecedorId: string,
    contato: Omit<FornecedorContato, "id" | "fornecedorId" | "createdAt" | "updatedAt">
  ): Promise<void> {
    if (contato.principal) {
      // Garante um único contato principal por fornecedor
      await prisma.fornecedorContato.updateMany({
        where: { fornecedorId },
        data: { principal: false },
      });
    }
    await prisma.fornecedorContato.create({ data: { ...contato, fornecedorId } });
  }

  async atualizarContato(
    contatoId: string,
    contato: Omit<FornecedorContato, "id" | "fornecedorId" | "createdAt" | "updatedAt">
  ): Promise<void> {
    if (contato.principal) {
      const atual = await prisma.fornecedorContato.findUnique({ where: { id: contatoId } });
      if (atual) {
        await prisma.fornecedorContato.updateMany({
          where: { fornecedorId: atual.fornecedorId, NOT: { id: contatoId } },
          data: { principal: false },
        });
      }
    }
    await prisma.fornecedorContato.update({ where: { id: contatoId }, data: contato });
  }

  async excluirContato(contatoId: string): Promise<void> {
    await prisma.fornecedorContato.delete({ where: { id: contatoId } });
  }
}

// ---------------------------------------------------------------------------
// Mapeamento interno
// ---------------------------------------------------------------------------

function toDomain(r: {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  logradouro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  ativo: boolean;
  tipos: string[];
  createdAt: Date;
  updatedAt: Date;
  contatos: Array<{
    id: string;
    fornecedorId: string;
    nome: string;
    cargo: string | null;
    telefone: string | null;
    email: string | null;
    principal: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): Fornecedor {
  return {
    id: r.id,
    codigo: r.codigo,
    razaoSocial: r.razaoSocial,
    nomeFantasia: r.nomeFantasia,
    cnpj: r.cnpj,
    email: r.email,
    telefone: r.telefone,
    logradouro: r.logradouro,
    cidade: r.cidade,
    estado: r.estado,
    cep: r.cep,
    observacoes: r.observacoes,
    ativo: r.ativo,
    tipos: r.tipos as Fornecedor["tipos"],
    contatos: r.contatos.map((c): FornecedorContato => ({
      id: c.id,
      fornecedorId: c.fornecedorId,
      nome: c.nome,
      cargo: c.cargo,
      telefone: c.telefone,
      email: c.email,
      principal: c.principal,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
