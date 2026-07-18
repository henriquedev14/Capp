"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { papelSchema, type PapelFormValues } from "@/features/papeis/schemas/papel-schema";
import { criarPapel, atualizarPapel } from "@/features/papeis/actions/papel-actions";
import { DESCRICOES_PERMISSOES, type PermissaoChave } from "@/core/auth/permissions";
import type { PapelGestao } from "@/core/auth/repositories/papel-repository";

// Agrupa as permissões por módulo (prefixo antes do ":") para exibição
// organizada — ex: "empreendimento:criar" → grupo "empreendimento".
const LABEL_GRUPO: Record<string, string> = {
  admin: "Administração",
  cliente: "Clientes",
  empreendimento: "Empreendimentos",
  fornecedor: "Fornecedores",
  financeiro: "Financeiro",
  dashboard: "Analytics",
};

function agruparPermissoes() {
  const grupos = new Map<string, { chave: PermissaoChave; descricao: string }[]>();
  for (const [chave, descricao] of Object.entries(DESCRICOES_PERMISSOES)) {
    const grupo = chave.split(":")[0] ?? "outros";
    if (!grupos.has(grupo)) grupos.set(grupo, []);
    grupos.get(grupo)!.push({ chave: chave as PermissaoChave, descricao });
  }
  return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));
}

interface PapelFormProps {
  papel?: PapelGestao;
}

export function PapelForm({ papel }: PapelFormProps) {
  const router = useRouter();
  const isEdicao = !!papel;
  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const grupos = React.useMemo(agruparPermissoes, []);

  const form = useForm<PapelFormValues>({
    resolver: zodResolver(papelSchema),
    mode: "onChange",
    defaultValues: {
      nome: papel?.nome ?? "",
      descricao: papel?.descricao ?? "",
      permissoes: papel?.permissoes ?? [],
    },
  });

  const permissoesSelecionadas = form.watch("permissoes");

  function toggle(chave: string) {
    const atual = form.getValues("permissoes");
    const novo = atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave];
    form.setValue("permissoes", novo, { shouldValidate: true, shouldDirty: true });
  }

  function toggleGrupo(chaves: string[]) {
    const atual = form.getValues("permissoes");
    const todasMarcadas = chaves.every((c) => atual.includes(c));
    const novo = todasMarcadas
      ? atual.filter((c) => !chaves.includes(c))
      : Array.from(new Set([...atual, ...chaves]));
    form.setValue("permissoes", novo, { shouldValidate: true, shouldDirty: true });
  }

  async function onSubmit(values: PapelFormValues) {
    setErro(null);
    setSalvando(true);
    const resultado = isEdicao
      ? await atualizarPapel(papel.id, values)
      : await criarPapel(values);
    if (resultado && "erro" in resultado) {
      setErro(resultado.erro);
      setSalvando(false);
    }
    // Em caso de sucesso, a action já faz redirect()
  }

  if (papel?.protegido) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
        <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
        <p className="text-sm text-foreground">
          O papel <strong>Admin</strong> é protegido pelo sistema e não pode ser editado —
          ele sempre mantém todas as permissões, garantindo que exista pelo menos um
          usuário com acesso total.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-[15px]">Dados do papel</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Nome *</label>
            <Input placeholder="Ex: Diretor, Coordenador, Comercial" {...form.register("nome")} />
            {form.formState.errors.nome && (
              <span className="text-xs text-destructive">{form.formState.errors.nome.message}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <Input placeholder="Opcional" {...form.register("descricao")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
          <CardTitle className="text-[15px]">
            Permissões
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({permissoesSelecionadas.length} selecionadas)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 flex flex-col gap-5">
          {grupos.map(([grupo, itens]) => {
            const chaves = itens.map((i) => i.chave);
            const todasMarcadas = chaves.every((c) => permissoesSelecionadas.includes(c));
            return (
              <div key={grupo} className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={todasMarcadas}
                    onChange={() => toggleGrupo(chaves)}
                    className="accent-primary"
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {LABEL_GRUPO[grupo] ?? grupo}
                  </span>
                </label>
                <div className="ml-6 flex flex-col gap-1.5">
                  {itens.map(({ chave, descricao }) => (
                    <label key={chave} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissoesSelecionadas.includes(chave)}
                        onChange={() => toggle(chave)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">{descricao}</span>
                      <span className="text-xs text-muted-foreground font-mono">({chave})</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {form.formState.errors.permissoes && (
            <span className="text-xs text-destructive">{form.formState.errors.permissoes.message}</span>
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
          {isEdicao ? "Salvar alterações" : "Criar papel"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/papeis")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
