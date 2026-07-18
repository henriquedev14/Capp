import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Protege todas as rotas do app exceto /login e os endpoints internos do
 * NextAuth. Usuários sem sessão válida são redirecionados para /login
 * automaticamente pelo withAuth.
 *
 * Além disso, força redirecionamento para /trocar-senha sempre que o JWT
 * indicar `precisaTrocarSenha: true` (usuário novo, ou senha resetada por
 * um Admin) — a pessoa não consegue acessar mais nada do sistema até
 * trocar a senha.
 *
 * IMPORTANTE: NÃO importamos authConfig aqui — withAuth() aceita apenas
 * um objeto com { pages, callbacks.authorized }, não um NextAuthOptions
 * completo. Tentar passar authConfig gera erro de tipo TypeScript:
 * "Type 'Partial<CallbacksOptions>' has no properties in common with
 * AuthorizedCallback". Por isso passamos o objeto diretamente.
 *
 * O middleware roda em Edge Runtime no Next.js 14, onde o Prisma Client
 * com driver adapter pg não funciona (depende de TCP sockets indisponíveis
 * no Edge). Como aqui só decodificamos o JWT para decidir redirecionar ou
 * não, não precisamos de adapter nem de tocar o banco — o withAuth lida
 * com isso internamente usando apenas o NEXTAUTH_SECRET para verificar
 * a assinatura do JWT.
 *
 * LOCALIZAÇÃO: este arquivo precisa estar em `src/middleware.ts` — e não
 * na raiz do projeto — porque este projeto usa a pasta `src/` para o App
 * Router (`src/app`). Quando há uma pasta `src/`, o middleware deve viver
 * no mesmo nível de `src/app`, ou é silenciosamente ignorado pelo Next.js.
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const pathname = req.nextUrl.pathname;

    // Sessão única: se esta sessão foi substituída por um login mais
    // recente em outro lugar, força logout e manda pro login com aviso —
    // não deixa a pessoa continuar usando uma sessão que já devia ter
    // morrido. Redireciona pra uma página dedicada que faz o signOut de
    // verdade no cliente (limpa o cookie), antes de mandar pro login.
    if (token?.sessaoInvalida && pathname !== "/sessao-encerrada") {
      return NextResponse.redirect(new URL("/sessao-encerrada", req.url));
    }

    if (token?.precisaTrocarSenha && pathname !== "/trocar-senha") {
      return NextResponse.redirect(new URL("/trocar-senha", req.url));
    }

    // 2FA obrigatório (Admin marcou) mas a pessoa ainda não configurou —
    // trava tudo até ela configurar. Só libera a própria página de
    // configuração, senão ninguém consegue nem chegar lá.
    if (
      token?.duploFatorObrigatorio &&
      !token?.duploFatorAtivo &&
      pathname !== "/configurar-2fa-obrigatorio" &&
      pathname !== "/trocar-senha"
    ) {
      return NextResponse.redirect(new URL("/configurar-2fa-obrigatorio", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
      error: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto:
     * - /login (a própria página de login)
     * - /esqueci-senha, /redefinir-senha/* (fluxo de reset de senha —
     *   precisam ser acessíveis SEM estar logado, por definição)
     * - /api/auth/* (endpoints do NextAuth)
     * - arquivos estáticos do Next.js e favicon
     */
    "/((?!login|esqueci-senha|redefinir-senha|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
