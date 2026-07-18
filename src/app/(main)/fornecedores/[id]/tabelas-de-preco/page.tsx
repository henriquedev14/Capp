export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/infra/db/prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { TabelaDePrecoView } from "@/features/fornecedores/components/tabela-de-preco-view";
import { listarTabelasPreco } from "@/features/fornecedores/actions/tabela-preco-actions";

interface Props {
  params: { id: string };
}

export default async function TabelaDePrecoFornecedorPage({ params }: Props) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: params.id },
    select: { id: true, razaoSocial: true, nomeFantasia: true },
  });
  if (!fornecedor) notFound();

  const tabelas = await listarTabelasPreco(fornecedor.id);

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
        breadcrumb={["Fornecedores", "Tabela de Preços Padrão"]}
        title={`Tabela de Preços Padrão — ${fornecedor.nomeFantasia || fornecedor.razaoSocial}`}
        description="Lista de preço mensal do fornecedor, importada da planilha padrão da empresa. Cada importação vira um registro novo — o histórico é sempre mantido, nada é sobrescrito."
      />
      <TabelaDePrecoView fornecedorId={fornecedor.id} tabelasIniciais={tabelas} />
    </div>
  );
}
