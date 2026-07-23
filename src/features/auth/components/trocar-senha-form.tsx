"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { KeyRound, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { trocarSenhaObrigatoria } from "@/features/auth/actions/trocar-senha-obrigatoria";

export function TrocarSenhaForm() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = React.useState("");
  const [novaSenha, setNovaSenha] = React.useState("");
  const [confirmacao, setConfirmacao] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha !== confirmacao) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }

    setSalvando(true);
    try {
      const r = await trocarSenhaObrigatoria(senhaAtual, novaSenha);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      await signOut({ redirect: false });
      router.push("/login?senhaAlterada=1");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-card-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <KeyRound className="h-6 w-6 text-warning" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Troque sua senha</h1>
          <p className="text-sm text-muted-foreground">
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Senha atual</label>
            <PasswordInput
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </div>
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

          <Button type="submit" disabled={salvando} className="mt-2">
            {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            Trocar senha e continuar
          </Button>
        </form>
      </div>
    </div>
  );
}
