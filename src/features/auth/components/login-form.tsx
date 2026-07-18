"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login-schema";
import { verificarPrecisaDuploFator } from "@/features/auth/actions/duplo-fator-actions";

/**
 * Formulário de login. Usa o Credentials Provider do NextAuth — sem
 * login social por agora, conforme decidido no Módulo 2.
 *
 * Fluxo em 2 etapas quando a conta tem 2FA ativado: primeiro valida
 * e-mail/senha (via verificarPrecisaDuploFator, sem criar sessão), e só
 * então mostra o campo de código — o signIn de verdade (que grava o log
 * de segurança) só acontece na etapa final, com tudo junto.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const senhaAlterada = searchParams.get("senhaAlterada") === "1";
  const sessaoEncerrada = searchParams.get("sessaoEncerrada") === "1";
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [etapa, setEtapa] = React.useState<"credenciais" | "2fa">("credenciais");
  const [codigo2FA, setCodigo2FA] = React.useState("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmitCredenciais(values: LoginFormValues) {
    setAuthError(null);
    setIsSubmitting(true);

    const { precisa } = await verificarPrecisaDuploFator(values.email, values.password);

    if (precisa) {
      setIsSubmitting(false);
      setEtapa("2fa");
      return;
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setAuthError("E-mail ou senha incorretos.");
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  async function onSubmit2FA(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    const values = form.getValues();
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      codigo2FA,
      redirect: false,
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setAuthError("Código incorreto. Tente de novo.");
      setCodigo2FA("");
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  if (etapa === "2fa") {
    return (
      <form onSubmit={onSubmit2FA} className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Abre o app autenticador (Google Authenticator, Authy...) e digita o código de 6 dígitos.
          </p>
        </div>

        <input
          value={codigo2FA}
          onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          autoFocus
          maxLength={6}
          inputMode="numeric"
          className="rounded-lg border border-input bg-background px-3 py-2 text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {authError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {authError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting || codigo2FA.length !== 6} className="mt-1">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirmar
        </Button>
        <button
          type="button"
          onClick={() => {
            setEtapa("credenciais");
            setCodigo2FA("");
            setAuthError(null);
          }}
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
      </form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitCredenciais)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="seu.nome@empresa.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Senha</FormLabel>
                <Link href="/esqueci-senha" className="text-xs font-medium text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {senhaAlterada && !authError && (
          <p className="rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success">
            Senha alterada com sucesso. Faça login com a nova senha.
          </p>
        )}

        {sessaoEncerrada && !authError && (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
            Sua sessão foi encerrada porque detectamos um login em outro dispositivo.
          </p>
        )}

        {authError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {authError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-1">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Entrar
        </Button>
      </form>
    </Form>
  );
}
