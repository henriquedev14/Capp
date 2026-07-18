/**
 * Papel para fins de GESTÃO (Admin criando/editando papéis) — diferente do
 * Papel "achatado" em entities/usuario.ts (que já vem com permissões
 * resolvidas para checagem de acesso). Aqui inclui contadores úteis pra UI.
 */
export interface PapelGestao {
  id: string;
  nome: string;
  descricao?: string | null;
  permissoes: string[]; // chaves de Permissao
  totalUsuarios: number;
  protegido: boolean; // true para "Admin" — não pode ser editado/excluído
  createdAt: Date;
  updatedAt: Date;
}

export interface CriarPapelInput {
  nome: string;
  descricao?: string | null;
  permissoes: string[];
}

export interface AtualizarPapelInput {
  nome?: string;
  descricao?: string | null;
  permissoes?: string[];
}

export interface PapelRepository {
  findAll(): Promise<PapelGestao[]>;
  findById(id: string): Promise<PapelGestao | null>;
  existsByNome(nome: string, excludeId?: string): Promise<boolean>;
  create(data: CriarPapelInput): Promise<PapelGestao>;
  update(id: string, data: AtualizarPapelInput): Promise<PapelGestao>;
  excluir(id: string): Promise<void>;
}
