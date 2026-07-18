export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/infra/db/prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { ImportarTabelaPrecosFornecedorView } from "@/features/fornecedores/components/importar-tabela-precos-fornecedor-view";

interface Props {
  params: { id: string };
}

export default async function ImportarTabelaPrecosFornecedorPage({ params }: Props) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: params.id },
    select: { id: true, razaoSocial: true, nomeFantasia: true },
  });
  if (!fornecedor) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/fornecedores/${fornecedor.id}`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o fornecedor
      </Link>
      <PageHeader
        breadcrumb={["Fornecedores", "Importar tabela de preços"]}
        title={`Importar tabela de preços — ${fornecedor.nomeFantasia || fornecedor.razaoSocial}`}
        description="Sobe a tabela de preços geral do fornecedor — cada item vira ou atualiza uma entrada no catálogo dele, sem depender de uma cotação específica."
      />
      <ImportarTabelaPrecosFornecedorView fornecedorId={fornecedor.id} />
    </div>
  );
}
