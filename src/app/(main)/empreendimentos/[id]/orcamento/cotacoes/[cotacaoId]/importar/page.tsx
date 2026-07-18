export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/infra/db/prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { ImportarRespostaCotacaoView } from "@/features/cotacoes/components/importar-resposta-cotacao-view";

interface Props {
  params: { id: string; cotacaoId: string };
}

export default async function ImportarRespostaCotacaoPage({ params }: Props) {
  const cotacao = await prisma.cotacao.findUnique({
    where: { id: params.cotacaoId },
    select: { id: true, numero: true, status: true, fornecedor: { select: { razaoSocial: true, nomeFantasia: true } } },
  });
  if (!cotacao) notFound();
  if (cotacao.status === "ACEITA" || cotacao.status === "RECUSADA") {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader breadcrumb={["Orçamentação", "Cotação", "Importar resposta"]} title="Cotação já finalizada" />
        <p className="text-sm text-muted-foreground">
          Essa cotação já está {cotacao.status === "ACEITA" ? "aceita" : "recusada"} — não é possível importar mais
          preços nela.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/empreendimentos/${params.id}/orcamento/cotacoes/${params.cotacaoId}`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para a cotação
      </Link>
      <PageHeader
        breadcrumb={["Orçamentação", "Cotação", "Importar resposta"]}
        title={`Importar resposta — ${cotacao.numero}`}
        description={`Sobe o PDF que ${cotacao.fornecedor.nomeFantasia || cotacao.fornecedor.razaoSocial} mandou de volta com os preços.`}
      />
      <ImportarRespostaCotacaoView cotacaoId={cotacao.id} />
    </div>
  );
}
