import { prisma } from "@/infra/db/prisma/client";

const LIMITE_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

/**
 * Registra um evento no log de segurança. Nunca lança erro — um problema
 * ao gravar o log não pode impedir o login/ação de acontecer (o log é
 * observabilidade, não parte do fluxo crítico).
 */
export async function registrarLogSeguranca(dados: {
  tipo:
    | "LOGIN_SUCESSO"
    | "LOGIN_FALHA"
    | "LOGIN_BLOQUEADO"
    | "PERMISSAO_NEGADA"
    | "SENHA_RESET_SOLICITADO"
    | "SENHA_RESET_CONCLUIDO"
    | "DUPLO_FATOR_ATIVADO"
    | "DUPLO_FATOR_DESATIVADO"
    | "DUPLO_FATOR_FALHA"
    | "LOGOUT_INATIVIDADE"
    | "SESSAO_ANTERIOR_ENCERRADA";
  email: string;
  usuarioId?: string | null;
  detalhes?: string | null;
}): Promise<void> {
  try {
    await prisma.logSeguranca.create({
      data: {
        tipo: dados.tipo,
        email: dados.email.toLowerCase().trim(),
        usuarioId: dados.usuarioId ?? null,
        detalhes: dados.detalhes ?? null,
      },
    });
  } catch (e) {
    console.error("[log-seguranca] falha ao registrar evento:", e);
  }
}

/**
 * Verifica se um e-mail está temporariamente bloqueado por excesso de
 * tentativas de login falhadas recentes — conta quantos LOGIN_FALHA
 * aconteceram nos últimos 15 minutos; 5 ou mais bloqueia por esse período.
 *
 * Propositalmente NÃO diferenciamos "bloqueado" de "senha errada" na
 * mensagem que o usuário vê (login-form.tsx sempre mostra "E-mail ou senha
 * incorretos") — informar que uma conta está bloqueada confirmaria pra um
 * atacante que aquele e-mail existe no sistema e está sendo alvo real.
 */
export async function verificarBloqueioLogin(email: string): Promise<boolean> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  const tentativasFalhas = await prisma.logSeguranca.count({
    where: {
      email: email.toLowerCase().trim(),
      tipo: "LOGIN_FALHA",
      createdAt: { gte: desde },
    },
  });
  return tentativasFalhas >= LIMITE_TENTATIVAS;
}
