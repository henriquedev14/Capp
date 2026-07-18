import type { DefaultSession } from "next-auth";

/**
 * Estende os tipos padrão do NextAuth para incluir os campos de RBAC
 * (papéis, permissões) que os callbacks jwt/session preenchem em
 * src/infra/auth/auth-options.ts.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nome: string;
      ativo: boolean;
      papeis: string[];
      permissoes: string[];
      precisaTrocarSenha: boolean;
      duploFatorAtivo: boolean;
      duploFatorObrigatorio: boolean;
      sessaoInvalida?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    sessaoToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    nome?: string;
    ativo?: boolean;
    papeis?: string[];
    permissoes?: string[];
    precisaTrocarSenha?: boolean;
    duploFatorAtivo?: boolean;
    duploFatorObrigatorio?: boolean;
    sessaoToken?: string;
    sessaoInvalida?: boolean;
  }
}
