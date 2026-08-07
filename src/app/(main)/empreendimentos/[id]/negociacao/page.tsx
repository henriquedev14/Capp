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

  const { cotacoes, historico } = await buscarDadosNegociacao(params.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Empreendimentos", empreendimento.nome, "Negociação"]}
        title="Negociação"
        description="Registre a decisão do cliente depois de conversar com ele — ligação, e-mail ou reunião."
      />
      <NegociacaoView empreendimentoId={params.id} cotacoes={cotacoes} historico={historico} />
    </div>
  );
}
