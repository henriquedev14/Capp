import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authenticator } from "otplib";

import { prisma } from "@/infra/db/prisma/client";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { authConfig } from "@/infra/auth/auth-config";
import { registrarLogSeguranca, verificarBloqueioLogin } from "@/infra/auth/log-seguranca";
import { enviarEmail } from "@/infra/email/enviar-email";
import { PERMISSOES } from "@/core/auth/permissions";

const usuarioRepository = new UsuarioPrismaRepository();

/**
 * Configuração COMPLETA do NextAuth (v4) — com Prisma Adapter e callbacks
 * que consultam o banco. Usada apenas pelo route handler
 * (src/app/api/auth/[...nextauth]/route.ts), que roda em Node.js runtime
 * (não Edge), onde o Prisma + driver adapter pg funcionam normalmente.
 *
 * O middleware.ts NÃO importa este arquivo — ele usa apenas
 * src/infra/auth/auth-config.ts (sem adapter), para evitar o erro
 * "PrismaClient is not configured to run in Edge Runtime", um problema
 * conhecido de Next.js 14 + NextAuth + Prisma quando o middleware roda
 * em Edge.
 *
 * Decisões importantes:
 * - session.strategy = "jwt": OBRIGATÓRIO ao usar Credentials Provider —
 *   sessões de banco de dados ("database") falham silenciosamente com
 *   Credentials, pois ele não passa por um fluxo de OAuth que o adapter
 *   possa persistir da forma usual.
 * - O PrismaAdapter recebe o client Prisma singleton já existente do
 *   projeto (src/infra/db/prisma/client.ts), que já está configurado com
 *   driver adapter (@prisma/adapter-pg) e engineType "client" — o
 *   PrismaAdapter só faz queries normais via Prisma Client, então não há
 *   conflito com essa configuração.
 * - As permissões resolvidas de todos os papéis do usuário são "achatadas"
 *   (flatMap + dedupe) e guardadas no token/sessão, para que o restante do
 *   app possa checar acesso sem fazer uma query a cada verificação.
 */
export const authOptions: NextAuthOptions = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
        codigo2FA: { label: "Código de verificação", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Bloqueio por excesso de tentativas — checa ANTES de gastar tempo
        // validando a senha (evita também dar pista de timing sobre se o
        // e-mail existe ou não no sistema).
        const bloqueado = await verificarBloqueioLogin(credentials.email);
        if (bloqueado) {
          await registrarLogSeguranca({
            tipo: "LOGIN_BLOQUEADO",
            email: credentials.email,
            detalhes: "Excesso de tentativas falhadas nos últimos 15 minutos.",
          });
          return null;
        }

        const usuario = await usuarioRepository.findByEmail(credentials.email);
        if (!usuario || !usuario.ativo) {
          await registrarLogSeguranca({
            tipo: "LOGIN_FALHA",
            email: credentials.email,
            detalhes: !usuario ? "E-mail não cadastrado." : "Usuário inativo.",
          });
          return null;
        }

        const record = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          select: { senhaHash: true },
        });
        if (!record?.senhaHash) {
          await registrarLogSeguranca({
            tipo: "LOGIN_FALHA",
            email: credentials.email,
            usuarioId: usuario.id,
            detalhes: "Usuário sem senha definida.",
          });
          return null;
        }

        const senhaValida = await bcrypt.compare(credentials.password, record.senhaHash);
        if (!senhaValida) {
          await registrarLogSeguranca({
            tipo: "LOGIN_FALHA",
            email: credentials.email,
            usuarioId: usuario.id,
            detalhes: "Senha incorreta.",
          });
          return null;
        }

        // Segundo fator — só entra aqui se o usuário tiver 2FA ativado.
        // O formulário de login já sabe disso de antemão (via a action
        // verificarPrecisaDuploFator) e só chama o signIn com o código
        // preenchido quando necessário.
        const usuarioComSegredo = await prisma.usuario.findUnique({
          where: { id: usuario.id },
          select: { duploFatorAtivo: true, duploFatorSecreto: true },
        });
        if (usuarioComSegredo?.duploFatorAtivo && usuarioComSegredo.duploFatorSecreto) {
          const codigo = credentials.codigo2FA?.trim();
          const valido = !!codigo && authenticator.check(codigo, usuarioComSegredo.duploFatorSecreto);
          if (!valido) {
            await registrarLogSeguranca({
              tipo: "DUPLO_FATOR_FALHA",
              email: credentials.email,
              usuarioId: usuario.id,
              detalhes: codigo ? "Código incorreto." : "Código não informado.",
            });
            return null;
          }
        }

        await registrarLogSeguranca({
          tipo: "LOGIN_SUCESSO",
          email: credentials.email,
          usuarioId: usuario.id,
        });

        // Sessão única: gera um token novo pra esta sessão. Se já havia
        // um token salvo (usuário já estava logado em outro lugar), essa
        // sessão antiga morre na próxima requisição dela (o jwt callback
        // compara e detecta a divergência) — e disparamos os alertas
        // agora, no momento exato da troca, não depois.
        const registroAnterior = await prisma.usuario.findUnique({
          where: { id: usuario.id },
          select: { sessaoAtualToken: true },
        });
        const haviaSessaoAnterior = !!registroAnterior?.sessaoAtualToken;

        const novoToken = crypto.randomBytes(24).toString("hex");
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { sessaoAtualToken: novoToken },
        });

        if (haviaSessaoAnterior) {
          await registrarLogSeguranca({
            tipo: "SESSAO_ANTERIOR_ENCERRADA",
            email: credentials.email,
            usuarioId: usuario.id,
            detalhes: "Novo login detectado — sessão anterior foi encerrada automaticamente.",
          });

          // Alerta pro dono da conta.
          await enviarEmail({
            para: credentials.email,
            assunto: "Novo login detectado na sua conta — ConstruApp",
            corpoTexto: `Olá, ${usuario.nome}.\n\nDetectamos um novo login na sua conta agora (${new Date().toLocaleString("pt-BR")}). Por segurança, qualquer sessão anterior sua foi encerrada automaticamente — só um dispositivo pode ficar conectado por vez.\n\nSe foi você, pode ignorar este e-mail. Se não foi você, troque sua senha imediatamente e avise um administrador.`,
          });

          // Alerta pros Admins — busca todos com permissão de gerenciar
          // usuários, não só um "admin" fixo (podem existir vários).
          const admins = await prisma.usuario.findMany({
            where: {
              ativo: true,
              papeis: {
                some: {
                  papel: {
                    permissoes: {
                      some: { permissao: { chave: PERMISSOES.ADMIN_GERENCIAR_USUARIOS } },
                    },
                  },
                },
              },
            },
            select: { email: true },
          });
          for (const admin of admins) {
            await enviarEmail({
              para: admin.email,
              assunto: `[ALERTA] Sessão duplicada detectada — ${usuario.nome}`,
              corpoTexto: `O usuário ${usuario.nome} (${credentials.email}) fez login em um novo dispositivo enquanto já tinha uma sessão ativa em outro lugar. A sessão anterior foi encerrada automaticamente.\n\nSe isso for inesperado, vale confirmar com a pessoa e considerar trocar a senha dela por precaução.`,
            });
          }
        }

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          sessaoToken: novoToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // `user` só vem preenchido no momento do login — nas requisições
      // seguintes, recarregamos do banco para refletir mudanças recentes
      // de papéis/permissões sem exigir um novo login.
      //
      // TROCA CONSCIENTE: isso significa uma consulta ao banco a cada
      // requisição que passe pelo callback jwt (ou seja, quase toda
      // requisição autenticada). Para o volume de usuários esperado neste
      // ERP interno, isso é aceitável. Se no futuro isso se tornar um
      // ponto de lentidão, a alternativa é cachear por alguns minutos
      // (ex: comparando um timestamp `token.iat` e só recarregando se mais
      // antigo que N minutos) — não implementado agora para não adicionar
      // complexidade sem necessidade comprovada.
      const userId = user?.id ?? token.sub;
      if (userId) {
        const usuario = await usuarioRepository.findById(userId);
        if (usuario) {
          token.sub = usuario.id;
          token.nome = usuario.nome;
          token.ativo = usuario.ativo;
          token.papeis = usuario.papeis.map((p) => p.nome);
          token.permissoes = Array.from(
            new Set(usuario.papeis.flatMap((p) => p.permissoes))
          );
          token.precisaTrocarSenha = usuario.precisaTrocarSenha;
          token.duploFatorAtivo = usuario.duploFatorAtivo;
          token.duploFatorObrigatorio = usuario.duploFatorObrigatorio;

          // Sessão única: no momento do login, `user.sessaoToken` vem
          // preenchido (gerado no authorize()) — grava ele no token.
          // Nas requisições seguintes, compara com o que está no banco
          // AGORA — se alguém logou em outro lugar depois, o banco tem
          // um token diferente, e esta sessão é marcada como inválida.
          if (user?.sessaoToken) {
            token.sessaoToken = user.sessaoToken;
          } else {
            const registroAtual = await prisma.usuario.findUnique({
              where: { id: usuario.id },
              select: { sessaoAtualToken: true },
            });
            token.sessaoInvalida =
              !!registroAtual?.sessaoAtualToken && registroAtual.sessaoAtualToken !== token.sessaoToken;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.nome = token.nome as string;
        session.user.ativo = token.ativo as boolean;
        session.user.papeis = (token.papeis as string[]) ?? [];
        session.user.permissoes = (token.permissoes as string[]) ?? [];
        session.user.precisaTrocarSenha = (token.precisaTrocarSenha as boolean) ?? false;
        session.user.duploFatorAtivo = (token.duploFatorAtivo as boolean) ?? false;
        session.user.duploFatorObrigatorio = (token.duploFatorObrigatorio as boolean) ?? false;
        session.user.sessaoInvalida = token.sessaoInvalida as boolean | undefined;
      }
      return session;
    },
  },
};
