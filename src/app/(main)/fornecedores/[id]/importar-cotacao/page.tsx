export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/infra/db/prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { listarCotacoesPendentesDoFornecedor } from "@/features/cotacoes/actions/cotacao-actions";
import { ImportarCotacaoFornecedorView } from "@/features/cotacoes/components/importar-cotacao-fornecedor-view";

interface Props {
  params: { id: string };
}

export default async function ImportarCotacaoFornecedorPage({ params }: Props) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: params.id },
    select: { id: true, razaoSocial: true, nomeFantasia: true },
  });
  if (!fornecedor) notFound();

  const cotacoesPendentes = await listarCotacoesPendentesDoFornecedor(fornecedor.id);

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
        breadcrumb={["Fornecedores", "Importar cotação"]}
        title={`Importar cotação — ${fornecedor.nomeFantasia || fornecedor.razaoSocial}`}
        description="Sobe o PDF que o fornecedor mandou — o sistema identifica sozinho qual cotação pendente é essa."
      />
      <ImportarCotacaoFornecedorView fornecedorId={fornecedor.id} cotacoesPendentes={cotacoesPendentes} />
    </div>
  );
}
