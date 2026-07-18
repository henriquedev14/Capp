import type { Cliente, ClienteResumo } from "@/core/clientes/entities/cliente";

export interface ClienteFiltros {
  busca?: string;   // busca por razão social ou CNPJ
  ativo?: boolean;  // undefined = todos, true = ativos, false = inativos
}

export interface ClienteRepository {
  findById(id: string): Promise<Cliente | null>;
  findMany(filtros?: ClienteFiltros): Promise<ClienteResumo[]>;
  findAtivos(): Promise<Pick<Cliente, "id" | "razaoSocial" | "nomeFantasia" | "tier">[]>;
  existsByCnpj(cnpj: string, excludeId?: string): Promise<boolean>;
  create(data: Omit<Cliente, "id" | "codigo" | "contatos" | "createdAt" | "updatedAt">): Promise<Cliente>;
  update(id: string, data: Partial<Omit<Cliente, "id" | "codigo" | "contatos" | "createdAt" | "updatedAt">>): Promise<Cliente>;
  inativar(id: string): Promise<void>;
  reativar(id: string): Promise<void>;
  temEmpreendimentos(id: string): Promise<boolean>;
}
