"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Truck, MapPin, UserPlus, Trash2, Star, Loader2, Tag } from "lucide-react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSection } from "@/components/form/form-section";
import { TextFormField } from "@/components/form/text-form-field";
import { EnderecoFields } from "@/components/form/endereco-fields";

import {
  fornecedorSchema,
  TIPOS_FORNECEDOR,
  type FornecedorFormValues,
} from "@/features/fornecedores/schemas/fornecedor-schema";
import {
  criarFornecedor,
  atualizarFornecedor,
} from "@/features/fornecedores/actions/fornecedor-actions";
import { ESTADOS_BR } from "@/features/empreendimentos/constants";
import type { Fornecedor } from "@/core/fornecedores/entities/fornecedor";

interface FornecedorFormProps {
  fornecedor?: Fornecedor;
}

export function FornecedorForm({ fornecedor }: FornecedorFormProps) {
  const isEdicao = !!fornecedor;
  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const submitandoRef = React.useRef(false);

  const form = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      razaoSocial: fornecedor?.razaoSocial ?? "",
      nomeFantasia: fornecedor?.nomeFantasia ?? "",
      cnpj: fornecedor?.cnpj ?? "",
      email: fornecedor?.email ?? "",
      telefone: fornecedor?.telefone ?? "",
      logradouro: fornecedor?.logradouro ?? "",
      numero: "",
      cidade: fornecedor?.cidade ?? "",
      estado: fornecedor?.estado ?? "",
      cep: fornecedor?.cep ?? "",
      observacoes: fornecedor?.observacoes ?? "",
      tipos: (fornecedor?.tipos ?? []) as string[],
      contatos: fornecedor?.contatos.map((c) => ({
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

  async function onSubmit(values: FornecedorFormValues) {
    if (submitandoRef.current) return;
    submitandoRef.current = true;

    setErro(null);
    setSalvando(true);
    try {
      const resultado = isEdicao
        ? await atualizarFornecedor(fornecedor.id, values)
        : await criarFornecedor(values);
      if (resultado?.erro) {
        setErro(resultado.erro);
        submitandoRef.current = false;
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* ── Dados do Fornecedor ── */}
        <FormSection
          icon={Truck}
          title="Dados do Fornecedor"
          description="Informações de identificação e contato principal."
        >
          <TextFormField
            control={form.control}
            name="razaoSocial"
            label="Razão social"
            placeholder="Distribuidora XYZ Ltda."
            required
            colSpan="full"
          />
          <TextFormField
            control={form.control}
            name="nomeFantasia"
            label="Nome fantasia"
            placeholder="XYZ Elétricos"
          />
          <TextFormField
            control={form.control}
            name="cnpj"
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            required
            inputMode="numeric"
            maxLength={18}
          />
          <TextFormField
            control={form.control}
            name="telefone"
            label="Telefone"
            placeholder="(34) 9 9999-0000"
            type="tel"
            inputMode="tel"
          />
          <TextFormField
            control={form.control}
            name="email"
            label="E-mail"
            placeholder="comercial@xyz.com.br"
            type="email"
          />
          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Prazo médio de entrega, condições comerciais, notas internas..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* ── Tipos de Fornecimento ── */}
        <FormSection
          icon={Tag}
          title="Tipos de Fornecimento"
          description="Selecione ao menos um tipo de material ou serviço que este fornecedor oferece. Usado para filtragem na Orçamentação."
        >
          <FormField
            control={form.control}
            name="tipos"
            render={() => (
              <FormItem className="sm:col-span-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TIPOS_FORNECEDOR.map((tipo) => (
                    <FormField
                      key={tipo.value}
                      control={form.control}
                      name="tipos"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(tipo.value)}
                              onCheckedChange={(checked) => {
                                const atual = field.value ?? [];
                                field.onChange(
                                  checked
                                    ? [...atual, tipo.value]
                                    : atual.filter((v) => v !== tipo.value)
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer leading-none pt-0.5">
                            {tipo.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* ── Endereço ── */}
        <FormSection
          icon={MapPin}
          title="Endereço"
          description="Localização do fornecedor — auxilia na logística e expedição."
        >
          <EnderecoFields
            cep={form.watch("cep") ?? ""}
            logradouro={form.watch("logradouro") ?? ""}
            numero={form.watch("numero") ?? ""}
            cidade={form.watch("cidade") ?? ""}
            estado={form.watch("estado") ?? ""}
            onChange={(campo, valor) =>
              form.setValue(campo as keyof FornecedorFormValues, valor, { shouldDirty: true })
            }
            estadosBR={ESTADOS_BR}
          />
        </FormSection>

        {/* ── Contatos ── */}
        <FormSection
          icon={UserPlus}
          title="Contatos"
          description="Pessoas de contato no fornecedor (vendedores, gerentes de conta, etc.)."
        >
          <div className="sm:col-span-2 flex flex-col gap-4">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum contato adicionado. O primeiro contato adicionado será
                marcado como principal automaticamente.
              </p>
            )}
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="relative grid grid-cols-1 gap-x-6 gap-y-4 rounded-lg border border-border bg-secondary/20 p-4 sm:grid-cols-2"
              >
                <div className="flex items-center gap-2 sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Contato {index + 1}
                  </span>
                  {index === 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      <Star className="h-3 w-3" />
                      Principal
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name={`contatos.${index}.nome`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ana Souza" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`contatos.${index}.cargo`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input placeholder="Consultora de vendas" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`contatos.${index}.telefone`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(34) 9 9999-0000"
                          type="tel"
                          inputMode="tel"
                          {...f}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`contatos.${index}.email`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ana@xyz.com.br"
                          type="email"
                          {...f}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() =>
                append({
                  nome: "",
                  cargo: "",
                  telefone: "",
                  email: "",
                  principal: false,
                })
              }
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar contato
            </Button>
          </div>
        </FormSection>

        {/* ── Rodapé ── */}
        {erro && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => history.back()}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdicao ? "Salvar alterações" : "Cadastrar fornecedor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
