export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PapelForm } from "@/features/papeis/components/papel-form";
import { PapelPrismaRepository } from "@/infra/db/prisma/repositories/papel-prisma-repository";

const repo = new PapelPrismaRepository();

export default async function EditarPapelPage({ params }: { params: { id: string } }) {
  const papel = await repo.findById(params.id);
  if (!papel) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/papeis"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Papéis
      </Link>
      <PageHeader
        breadcrumb={["Papéis", papel.nome, "Editar"]}
        title={`Editar papel: ${papel.nome}`}
        description="Ajuste o nome, descrição e as permissões deste papel."
      />
      <div className="max-w-3xl">
        <PapelForm papel={papel} />
      </div>
    </div>
  );
}
