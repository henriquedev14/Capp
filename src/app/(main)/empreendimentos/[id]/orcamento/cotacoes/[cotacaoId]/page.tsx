export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { CotacaoDetailView } from "@/features/cotacoes/components/cotacao-detail-view";
import { buscarCotacaoDetalhe } from "@/features/cotacoes/actions/cotacao-actions";

interface Props {
  params: { id: string; cotacaoId: string };
}

export default async function CotacaoDetailPage({ params }: Props) {
  const detalhe = await buscarCotacaoDetalhe(params.cotacaoId, params.id);
  if (!detalhe) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/empreendimentos/${params.id}/orcamento`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o Orçamento
      </Link>

      <PageHeader
        breadcrumb={[
          "Empreendimentos",
          detalhe.empreendimento.nome,
          "Orçamento",
          "Cotação",
        ]}
        title={`Cotação ${detalhe.numero}`}
        description={`Fornecedor: ${detalhe.fornecedor.nomeExibido}`}
      />

      <CotacaoDetailView cotacao={detalhe} />
    </div>
  );
}
