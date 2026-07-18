"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { solicitarResetSenha } from "@/features/auth/actions/reset-senha-actions";

export function EsqueciSenhaForm() {
  const [email, setEmail] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [enviado, setEnviado] = React.useState(false);
  const [avisoSemEmail, setAvisoSemEmail] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await solicitarResetSenha(email);
      setEnviado(true);
      setAvisoSemEmail(!!r.avisoSemEmail);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-card-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Esqueceu sua senha?</h1>
          <p className="text-sm text-muted-foreground">
            Digite seu e-mail — se ele estiver cadastrado, enviamos um link pra redefinir.
          </p>
        </div>

        {enviado ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm text-foreground">
              Se <strong>{email}</strong> estiver cadastrado, você vai receber um e-mail com o link em
              instantes.
            </p>
            {avisoSemEmail && (
              <p className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                Aviso técnico: o envio de e-mail ainda não está configurado neste sistema (Resend). Peça
                pro administrador olhar o log do servidor pra pegar o link manualmente.
              </p>
            )}
            <Link href="/login" className="mt-2 text-sm font-medium text-primary hover:underline">
              Voltar pro login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Enviar link de redefinição
            </Button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar pro login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
