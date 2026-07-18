import type { Fornecedor, FornecedorResumo, TipoFornecedor } from "@/core/fornecedores/entities/fornecedor";

export interface FornecedorFiltros {
  busca?: string;
  ativo?: boolean;
  tipo?: TipoFornecedor;
}

export interface FornecedorRepository {
  findById(id: string): Promise<Fornecedor | null>;
  findMany(filtros?: FornecedorFiltros): Promise<FornecedorResumo[]>;
  /** Para selects: todos os fornecedores ativos (id + nome + tipos) */
  findAtivos(): Promise<Pick<Fornecedor, "id" | "razaoSocial" | "nomeFantasia" | "tipos">[]>;
  existsByCnpj(cnpj: string, excludeId?: string): Promise<boolean>;
  create(data: Omit<Fornecedor, "id" | "codigo" | "contatos" | "createdAt" | "updatedAt"> & { contatos?: Array<Omit<Fornecedor["contatos"][number], "id" | "fornecedorId" | "createdAt" | "updatedAt">> }): Promise<Fornecedor>;
  update(id: string, data: Partial<Omit<Fornecedor, "id" | "codigo" | "contatos" | "createdAt" | "updatedAt">>): Promise<Fornecedor>;
  sincronizarContatos(fornecedorId: string, contatos: Array<Omit<Fornecedor["contatos"][number], "fornecedorId" | "createdAt" | "updatedAt">>): Promise<void>;
  inativar(id: string): Promise<void>;
  reativar(id: string): Promise<void>;
}
