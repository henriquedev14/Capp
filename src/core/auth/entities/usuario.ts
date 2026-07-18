/**
 * Entidade de domínio: Usuario.
 *
 * Representa quem faz login no sistema. Não importa nada do Prisma ou do
 * NextAuth — apenas o suficiente para o restante do código de negócio
 * (use-cases, verificação de permissões) trabalhar sem depender de detalhe
 * de infraestrutura.
 */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo?: string | null;
  telefone?: string | null;
  ativo: boolean;
  precisaTrocarSenha: boolean;
  duploFatorAtivo: boolean;
  duploFatorObrigatorio: boolean;
  papeis: Papel[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Papel atribuído a um Usuario, já com suas permissões resolvidas — é o
 * formato que o restante do app consome para checar acesso, sem precisar
 * fazer joins adicionais.
 */
export interface Papel {
  id: string;
  nome: string;
  descricao?: string | null;
  permissoes: string[]; // chaves de Permissao, ex: "empreendimento:criar"
}
