"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usuarioSchema, type UsuarioFormValues } from "@/features/usuarios/schemas/usuario-schema";
import { criarUsuario, atualizarUsuario } from "@/features/usuarios/actions/usuario-actions";
import { RedefinirSenhaDialog } from "@/features/usuarios/components/redefinir-senha-dialog";
import { ExigirDuploFatorButton } from "@/features/usuarios/components/exigir-duplo-fator-button";
import type { Usuario } from "@/core/auth/entities/usuario";

interface PapelOption {
  id: string;
  nome: string;
  descricao?: string | null;
}

interface UsuarioFormProps {
  usuario?: Usuario;
  papeisDisponiveis: PapelOption[];
}

export function UsuarioForm({ usuario, papeisDisponiveis }: UsuarioFormProps) {
  const router = useRouter();
  const isEdicao = !!usuario;
  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [mostrarSenha, setMostrarSenha] = React.useState(false);
  const [redefinirAberto, setRedefinirAberto] = React.useState(false);

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
    mode: "onChange",
    defaultValues: {
      nome: usuario?.nome ?? "",
      email: usuario?.email ?? "",
      senha: "",
      papeisIds: usuario?.papeis.map((p) => p.id) ?? [],
    },
  });

  const papeisSelecionados = form.watch("papeisIds");

  function togglePapel(id: string) {
    const atual = form.getValues("papeisIds");
    const novo = atual.includes(id) ? atual.filter((p) => p !== id) : [...atual, id];
    form.setValue("papeisIds", novo, { shouldValidate: true, shouldDirty: true });
  }

  async function onSubmit(values: UsuarioFormValues) {
    setErro(null);
    setSalvando(true);
    const resultado = isEdicao
      ? await atualizarUsuario(usuario.id, values)
      : await criarUsuario(values);
    if (resultado && "erro" in resultado) {
      setErro(resultado.erro);
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-[15px]">Dados de acesso</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Nome completo *</label>
            <Input placeholder="Ex: Maria Silva" {...form.register("nome")} />
            {form.formState.errors.nome && (
              <span className="text-xs text-destructive">{form.formState.errors.nome.message}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">E-mail *</label>
            <Input type="email" placeholder="maria@hgigroup.com.br" {...form.register("email")} />
            {form.formState.errors.email && (
              <span className="text-xs text-destructive">{form.formState.errors.email.message}</span>
            )}
          </div>

          {!isEdicao ? (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Senha inicial *</label>
              <div className="relative">
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo de 8 caracteres"
                  {...form.register("senha")}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.senha && (
                <span className="text-xs text-destructive">{form.formState.errors.senha.message}</span>
              )}
              <p className="text-xs text-muted-foreground">
                O usuário poderá trocar a senha depois de fazer login.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Senha</label>
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setRedefinirAberto(true)}>
                Redefinir senha
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {usuario && (
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-[15px]">Segurança</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3 pt-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                Exigir autenticação em 2 fatores
              </span>
              <span className="text-xs text-muted-foreground">
                {usuario.duploFatorObrigatorio
                  ? "Ativado — a pessoa é forçada a configurar 2FA no próximo login, se ainda não tiver."
                  : "Desativado — 2FA é opcional pra essa pessoa."}
              </span>
            </div>
            <ExigirDuploFatorButton usuarioId={usuario.id} exigido={usuario.duploFatorObrigatorio} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-[15px]">
            Papéis
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({papeisSelecionados.length} selecionados)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {papeisDisponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum papel cadastrado ainda —{" "}
              <a href="/papeis/novo" className="text-primary hover:underline">
                crie um papel primeiro
              </a>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {papeisDisponiveis.map((papel) => {
                const marcado = papeisSelecionados.includes(papel.id);
                return (
                  <label
                    key={papel.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => togglePapel(papel.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium text-foreground">{papel.nome}</span>
                    {papel.descricao && (
                      <span className="text-xs text-muted-foreground">— {papel.descricao}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          {form.formState.errors.papeisIds && (
            <span className="text-xs text-destructive mt-2 block">
              {form.formState.errors.papeisIds.message}
            </span>
          )}
        </CardContent>
      </Card>

      {erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdicao ? "Salvar alterações" : "Criar usuário"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/pessoas")}>
          Cancelar
        </Button>
      </div>

      {isEdicao && (
        <RedefinirSenhaDialog
          usuarioId={usuario.id}
          aberto={redefinirAberto}
          onFechar={() => setRedefinirAberto(false)}
        />
      )}
    </form>
  );
}
