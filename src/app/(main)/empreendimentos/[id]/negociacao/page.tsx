export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { buscarDadosNegociacao } from "@/features/negociacao/actions/negociacao-actions";
import { NegociacaoView } from "@/features/negociacao/components/negociacao-view";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();

interface Props {
  params: { id: string };
}

export default async function NegociacaoPage({ params }: Props) {
  const empreendimento = await empreendimentoRepo.findById(params.id);
  if (!empreendimento) notFound();

  const dados = await buscarDadosNegociacao(params.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Negociação", empreendimento.nome]}
        title="Negociação"
        description="Timeline de interações com o cliente — contato, contraproposta, ganha ou perdida."
      />
      <NegociacaoView empreendimentoId={params.id} {...dados} />
    </div>
  );
}
