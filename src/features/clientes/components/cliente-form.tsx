"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, MapPin, UserPlus, Trash2, Star, Loader2 } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/components/form/form-section";
import { TextFormField } from "@/components/form/text-form-field";
import { EnderecoFields } from "@/components/form/endereco-fields";
import { TierSelectField } from "@/features/tiers/components/tier-select-field";

import { clienteSchema, type ClienteFormValues } from "@/features/clientes/schemas/cliente-schema";
import { criarCliente, atualizarCliente } from "@/features/clientes/actions/cliente-actions";
import { ESTADOS_BR } from "@/features/empreendimentos/constants";
import type { Cliente } from "@/core/clientes/entities/cliente";
interface ClienteFormProps {
  cliente?: Cliente;
  podeDefinirTier?: boolean;
}

export function ClienteForm({ cliente, podeDefinirTier = false }: ClienteFormProps) {
  const isEdicao = !!cliente;
  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const submitandoRef = React.useRef(false);

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      razaoSocial: cliente?.razaoSocial ?? "",
      nomeFantasia: cliente?.nomeFantasia ?? "",
      cnpj: cliente?.cnpj ?? "",
      email: cliente?.email ?? "",
      telefone: cliente?.telefone ?? "",
      logradouro: cliente?.logradouro ?? "",
      numero: "",
      cidade: cliente?.cidade ?? "",
      estado: cliente?.estado ?? "",
      cep: cliente?.cep ?? "",
      tier: cliente?.tier != null ? String(cliente.tier) : "",
      contatos: cliente?.contatos.map((c) => ({
        id: c.id,
        nome: c.nome,
        cargo: c.cargo ?? "",
        telefone: c.telefone ?? "",
        email: c.email ?? "",
        principal: c.principal,
      })) ?? [],
    },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contatos",
  });

  async function onSubmit(values: ClienteFormValues) {
    if (submitandoRef.current) return;
    submitandoRef.current = true;

    setErro(null);
    setSalvando(true);
    try {
      const resultado = isEdicao
        ? await atualizarCliente(cliente.id, values)
        : await criarCliente(values);
      if (resultado?.erro) {
        setErro(resultado.erro);
        submitandoRef.current = false;
      }
    } finally {
      setSalvando(false);
      // Não resetamos submitandoRef aqui no finally porque em caso de
      // sucesso o formulário já redirecionou — resetar só em caso de erro
      // (feito acima) para permitir nova tentativa.
    }
  }

  function adicionarContato() {
    append({ nome: "", cargo: "", telefone: "", email: "", principal: fields.length === 0 });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 pb-28">
        <FormSection
          icon={Building2}
          title="Dados da construtora"
          description="Informações principais da empresa"
        >
          <TextFormField
            control={form.control}
            name="razaoSocial"
            label="Razão social"
            placeholder="Ex: MRV Engenharia e Participações S.A."
            colSpan="full"
            required
          />
          <TextFormField
            control={form.control}
            name="nomeFantasia"
            label="Nome fantasia"
            placeholder="Ex: MRV"
          />
          <TextFormField
            control={form.control}
            name="cnpj"
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            maxLength={18}
            inputMode="numeric"
            required
          />
          <TextFormField
            control={form.control}
            name="telefone"
            label="Telefone"
            placeholder="(00) 0000-0000 ou (00) 9 0000-0000"
            type="tel"
            maxLength={16}
            inputMode="numeric"
          />
          <TextFormField
            control={form.control}
            name="email"
            label="E-mail"
            placeholder="contato@construtora.com.br"
            type="email"
          />
          {podeDefinirTier ? (
            <TierSelectField
              control={form.control}
              name="tier"
              label="Tier (padrão construtivo)"
              descricao="Define o multiplicador do serviço HGI na orçamentação. Herdado pelos empreendimentos desta construtora."
            />
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Tier (padrão construtivo)</label>
              <div className="flex h-10 items-center rounded-md border border-input bg-secondary/50 px-3 text-sm text-muted-foreground">
                {cliente?.tier != null ? `Tier ${cliente.tier}` : "Não classificado"}
              </div>
              <p className="text-xs text-muted-foreground">
                Somente Admin ou Diretor podem definir o Tier.
              </p>
            </div>
          )}
        </FormSection>

        <FormSection
          icon={MapPin}
          title="Endereço"
          description="Localização da sede da construtora"
        >
          <EnderecoFields
            cep={form.watch("cep") ?? ""}
            logradouro={form.watch("logradouro") ?? ""}
            numero={form.watch("numero") ?? ""}
            cidade={form.watch("cidade") ?? ""}
            estado={form.watch("estado") ?? ""}
            onChange={(campo, valor) =>
              form.setValue(campo as keyof ClienteFormValues, valor, { shouldDirty: true })
            }
            estadosBR={ESTADOS_BR}
          />
        </FormSection>

        <FormSection
          icon={UserPlus}
          title="Contatos"
          description="Pessoas de contato nesta construtora"
        >
          <div className="sm:col-span-2 flex flex-col gap-4">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum contato adicionado ainda.
              </p>
            )}

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-border bg-secondary/30 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Contato {index + 1}
                    </span>
                    {field.principal && (
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Star className="h-3 w-3 fill-primary" />
                        Principal
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Nome *</label>
                    <Input
                      placeholder="Nome completo"
                      {...form.register(`contatos.${index}.nome`)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Cargo</label>
                    <Input
                      placeholder="Ex: Gerente Comercial"
                      {...form.register(`contatos.${index}.cargo`)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Telefone</label>
                    <Input
                      type="tel"
                      placeholder="(00) 0000-0000 ou (00) 9 0000-0000"
                      maxLength={16}
                      inputMode="numeric"
                      {...form.register(`contatos.${index}.telefone`)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">E-mail</label>
                    <Input
                      type="email"
                      placeholder="contato@email.com"
                      {...form.register(`contatos.${index}.email`)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={adicionarContato} className="w-full">
              <UserPlus className="h-4 w-4" />
              Adicionar contato
            </Button>
          </div>
        </FormSection>

        {erro && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {erro}
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:pl-60">
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-6 py-4 sm:px-8">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar alterações" : "Cadastrar construtora"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
