export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { FornecedorForm } from "@/features/fornecedores/components/fornecedor-form";
import { FornecedorPrismaRepository } from "@/infra/db/prisma/repositories/fornecedor-prisma-repository";

const repo = new FornecedorPrismaRepository();

export default async function EditarFornecedorPage({
  params,
}: {
  params: { id: string };
}) {
  const fornecedor = await repo.findById(params.id);
  if (!fornecedor) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumb={[
          "Fornecedores",
          fornecedor.nomeFantasia ?? fornecedor.razaoSocial,
          "Editar",
        ]}
        title="Editar Fornecedor"
        description={`Editando ${fornecedor.nomeFantasia ?? fornecedor.razaoSocial}`}
      />
      <FornecedorForm fornecedor={fornecedor} />
    </div>
  );
}
