export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ShieldAlert, LogIn, LogOut, Lock, Ban, KeyRound, ShieldCheck, ShieldOff, Clock, Monitor } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/infra/db/prisma/client";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const ICONE_POR_TIPO = {
  LOGIN_SUCESSO: LogIn,
  LOGIN_FALHA: LogOut,
  LOGIN_BLOQUEADO: Lock,
  PERMISSAO_NEGADA: Ban,
  SENHA_RESET_SOLICITADO: KeyRound,
  SENHA_RESET_CONCLUIDO: KeyRound,
  DUPLO_FATOR_ATIVADO: ShieldCheck,
  DUPLO_FATOR_DESATIVADO: ShieldOff,
  DUPLO_FATOR_FALHA: ShieldAlert,
  LOGOUT_INATIVIDADE: Clock,
  SESSAO_ANTERIOR_ENCERRADA: Monitor,
} as const;

const COR_POR_TIPO = {
  LOGIN_SUCESSO: "text-success bg-success/10",
  LOGIN_FALHA: "text-warning bg-warning/10",
  LOGIN_BLOQUEADO: "text-destructive bg-destructive/10",
  PERMISSAO_NEGADA: "text-destructive bg-destructive/10",
  SENHA_RESET_SOLICITADO: "text-warning bg-warning/10",
  SENHA_RESET_CONCLUIDO: "text-success bg-success/10",
  DUPLO_FATOR_ATIVADO: "text-success bg-success/10",
  DUPLO_FATOR_DESATIVADO: "text-warning bg-warning/10",
  DUPLO_FATOR_FALHA: "text-destructive bg-destructive/10",
  LOGOUT_INATIVIDADE: "text-muted-foreground bg-secondary",
  SESSAO_ANTERIOR_ENCERRADA: "text-warning bg-warning/10",
} as const;

const LABEL_POR_TIPO = {
  LOGIN_SUCESSO: "Login bem-sucedido",
  LOGIN_FALHA: "Tentativa de login falhou",
  LOGIN_BLOQUEADO: "Login bloqueado (excesso de tentativas)",
  PERMISSAO_NEGADA: "Permissão negada",
  SENHA_RESET_SOLICITADO: "Reset de senha solicitado",
  SENHA_RESET_CONCLUIDO: "Senha redefinida",
  DUPLO_FATOR_ATIVADO: "Autenticação em 2 fatores ativada",
  DUPLO_FATOR_DESATIVADO: "Autenticação em 2 fatores desativada",
  DUPLO_FATOR_FALHA: "Código de 2 fatores incorreto",
  LOGOUT_INATIVIDADE: "Sessão encerrada por inatividade",
  SESSAO_ANTERIOR_ENCERRADA: "Sessão encerrada — login detectado em outro dispositivo",
} as const;

export default async function SegurancaPage() {
  const podeVer = await temPermissao(PERMISSOES.SEGURANCA_VER_LOG);
  if (!podeVer) redirect("/painel");

  const [logs, totalBloqueios24h, totalFalhas24h] = await Promise.all([
    prisma.logSeguranca.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { usuario: { select: { nome: true } } },
    }),
    prisma.logSeguranca.count({
      where: { tipo: "LOGIN_BLOQUEADO", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.logSeguranca.count({
      where: { tipo: "LOGIN_FALHA", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Segurança"]}
        title="Log de Segurança"
        description="Tentativas de login, bloqueios por excesso de tentativas, e permissões negadas — últimos 200 eventos."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className={totalBloqueios24h > 0 ? "border-destructive/40 bg-destructive/5" : undefined}>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <Lock className="h-[18px] w-[18px] text-destructive" />
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bloqueios (24h)
              </span>
              <div className="text-xl font-bold text-foreground">{totalBloqueios24h}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <ShieldAlert className="h-[18px] w-[18px] text-warning" />
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tentativas falhadas (24h)
              </span>
              <div className="text-xl font-bold text-foreground">{totalFalhas24h}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {logs.map((log) => {
                const Icone = ICONE_POR_TIPO[log.tipo];
                return (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${COR_POR_TIPO[log.tipo]}`}>
                      <Icone className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium text-foreground">{LABEL_POR_TIPO[log.tipo]}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {log.email}
                        {log.usuario?.nome && ` (${log.usuario.nome})`}
                        {log.detalhes && ` — ${log.detalhes}`}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {log.createdAt.toLocaleString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
