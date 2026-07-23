"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, Check, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { redefinirSenhaComToken } from "@/features/auth/actions/reset-senha-actions";

interface Props {
  token: string;
  valido: boolean;
  nome?: string;
}

export function RedefinirSenhaForm({ token, valido, nome }: Props) {
  const router = useRouter();
  const [novaSenha, setNovaSenha] = React.useState("");
  const [confirmacao, setConfirmacao] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [concluido, setConcluido] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (novaSenha !== confirmacao) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }
    setSalvando(true);
    try {
      const r = await redefinirSenhaComToken(token, novaSenha);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setConcluido(true);
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setSalvando(false);
    }
  }

  if (!valido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 text-center shadow-card-md">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">Link inválido ou expirado</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esse link já foi usado, expirou (validade de 1 hora), ou não existe.
          </p>
          <Link href="/esqueci-senha" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Solicitar um novo link
          </Link>
        </div>
      </div>
    );
  }

  if (concluido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 text-center shadow-card-md">
          <Check className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">Senha redefinida!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Redirecionando pro login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-card-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            {nome ? `Olá, ${nome}` : "Definir nova senha"}
          </h1>
          <p className="text-sm text-muted-foreground">Escolha uma nova senha pra sua conta.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Nova senha</label>
            <PasswordInput
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={8}
            />
            <span className="text-xs text-muted-foreground">Mínimo 8 caracteres.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Confirmar nova senha</label>
            <PasswordInput
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              required
            />
          </div>
          {erro && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {erro}
            </div>
          )}
          <Button type="submit" disabled={salvando}>
            {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            Redefinir senha
          </Button>
        </form>
      </div>
    </div>
  );
}
