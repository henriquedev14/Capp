import type { NextAuthOptions } from "next-auth";

/**
 * Configuração BASE do NextAuth — compatível com o Edge Runtime, pois não
 * importa o Prisma Adapter (que depende de TCP sockets, indisponíveis no
 * Edge). É esta config que o middleware.ts usa para apenas decodificar o
 * JWT e decidir se redireciona para /login — sem nunca tocar no banco.
 *
 * `providers: []` é intencional aqui (não é um placeholder esquecido): o
 * middleware nunca invoca authorize() de um provider, apenas decodifica
 * um JWT já emitido — por isso a config base não precisa declarar nenhum
 * provider de fato. Os providers reais ficam em auth-options.full.ts.
 *
 * A config completa (com adapter, providers e callbacks que consultam o
 * banco) fica em auth-options.full.ts, e é usada apenas pelo route handler
 * (src/app/api/auth/[...nextauth]/route.ts), que roda em Node.js runtime.
 */
export const authConfig: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
};

