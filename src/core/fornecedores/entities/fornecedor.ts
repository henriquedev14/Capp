export type TipoFornecedor =
  | "ELETRODUTOS"
  | "CABOS"
  | "QUADROS"
  | "LUMINARIAS"
  | "TOMADAS_INTERRUPTORES"
  | "MATERIAIS_HIDRAULICOS"
  | "MATERIAIS_CIVIS"
  | "FERRAMENTAS"
  | "SERVICOS"
  | "OUTROS";

export interface FornecedorContato {
  id?: string; // opcional — undefined quando é um contato novo ainda não salvo
  fornecedorId: string;
  nome: string;
  cargo?: string | null;
  telefone?: string | null;
  email?: string | null;
  principal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Fornecedor {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  tipos: TipoFornecedor[];
  contatos: FornecedorContato[];
  createdAt: Date;
  updatedAt: Date;
}

/** Versão resumida usada na tabela de listagem */
export interface FornecedorResumo {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  cidade?: string | null;
  estado?: string | null;
  ativo: boolean;
  tipos: TipoFornecedor[];
  totalContatos: number;
}
