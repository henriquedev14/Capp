export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ClienteForm } from "@/features/clientes/components/cliente-form";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const repo = new ClientePrismaRepository();

export default async function EditarClientePage({
  params,
}: {
  params: { id: string };
}) {
  const cliente = await repo.findById(params.id);
  if (!cliente) notFound();
  const podeDefinirTier = await temPermissao(PERMISSOES.CLIENTE_DEFINIR_TIER);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/clientes/${cliente.id}`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para {cliente.nomeFantasia ?? cliente.razaoSocial}
      </Link>
      <PageHeader
        breadcrumb={[
          "Clientes",
          cliente.nomeFantasia ?? cliente.razaoSocial,
          "Editar",
        ]}
        title="Editar construtora"
        description={cliente.nomeFantasia ?? cliente.razaoSocial}
      />
      <div className="max-w-3xl">
        <ClienteForm cliente={cliente} podeDefinirTier={podeDefinirTier} />
      </div>
    </div>
  );
}
