import { prisma } from "@/infra/db/prisma/client";
import { gerarCodigoCliente } from "@/infra/db/codigos";
import type { ClienteRepository, ClienteFiltros } from "@/core/clientes/repositories/cliente-repository";
import type { Cliente, ClienteContato, ClienteResumo } from "@/core/clientes/entities/cliente";

const CONTATO_INCLUDE = {
  contatos: { orderBy: { principal: "desc" as const } },
} as const;

export class ClientePrismaRepository implements ClienteRepository {
  async findById(id: string): Promise<Cliente | null> {
    const r = await prisma.cliente.findUnique({
      where: { id },
      include: CONTATO_INCLUDE,
    });
    return r ? toDomain(r) : null;
  }

  async findMany(filtros?: ClienteFiltros): Promise<ClienteResumo[]> {
    const records = await prisma.cliente.findMany({
      where: {
        ...(filtros?.ativo !== undefined && { ativo: filtros.ativo }),
        ...(filtros?.busca && {
          OR: [
            { razaoSocial: { contains: filtros.busca, mode: "insensitive" } },
            { nomeFantasia: { contains: filtros.busca, mode: "insensitive" } },
            { cnpj: { contains: filtros.busca } },
          ],
        }),
      },
      include: { _count: { select: { empreendimentos: true } } },
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
      tier: r.tier,
      totalEmpreendimentos: r._count.empreendimentos,
    }));
  }

  async findAtivos() {
    return prisma.cliente.findMany({
      where: { ativo: true },
      select: { id: true, razaoSocial: true, nomeFantasia: true, tier: true },
      orderBy: { razaoSocial: "asc" },
    });
  }

  async existsByCnpj(cnpj: string, excludeId?: string): Promise<boolean> {
    const count = await prisma.cliente.count({
      where: { cnpj, ...(excludeId && { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  async create(data: Omit<Cliente, "id" | "codigo" | "contatos" | "createdAt" | "updatedAt">): Promise<Cliente> {
    const codigo = await gerarCodigoCliente();
    const r = await prisma.cliente.create({
      data: {
        codigo,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        cnpj: data.cnpj,
        email: data.email,
        telefone: data.telefone,
        logradouro: data.logradouro,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep,
        ativo: data.ativo,
        tier: data.tier,
      },
      include: CONTATO_INCLUDE,
    });
    return toDomain(r);
  }

  async update(
    id: string,
    data: Partial<Omit<Cliente, "id" | "codigo" | "contatos" | "createdAt" | "updatedAt">>
  ): Promise<Cliente> {
    const r = await prisma.cliente.update({
      where: { id },
      data,
      include: CONTATO_INCLUDE,
    });
    return toDomain(r);
  }

  async inativar(id: string): Promise<void> {
    await prisma.cliente.update({ where: { id }, data: { ativo: false } });
  }

  async reativar(id: string): Promise<void> {
    await prisma.cliente.update({ where: { id }, data: { ativo: true } });
  }

  async temEmpreendimentos(id: string): Promise<boolean> {
    const count = await prisma.empreendimento.count({ where: { clienteId: id } });
    return count > 0;
  }
}

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
  ativo: boolean;
  tier: number | null;
  createdAt: Date;
  updatedAt: Date;
  contatos: Array<{
    id: string;
    clienteId: string;
    nome: string;
    cargo: string | null;
    telefone: string | null;
    email: string | null;
    principal: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): Cliente {
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
    ativo: r.ativo,
    tier: r.tier,
    contatos: r.contatos.map((c): ClienteContato => ({
      id: c.id,
      clienteId: c.clienteId,
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
