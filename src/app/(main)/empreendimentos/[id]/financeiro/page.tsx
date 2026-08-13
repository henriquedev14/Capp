export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { buscarVidaFinanceira } from "@/features/financeiro/queries/vida-financeira";
import { VidaFinanceiraView } from "@/features/financeiro/components/vida-financeira-view";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();

interface Props {
  params: { id: string };
}

/**
 * "Vida Financeira" — panorama de Contas a Receber e Contrato de
 * QUALQUER empreendimento. Mesmo espírito da "Vida da Produção".
 * Pedido pelo Henrique em 13/08/2026.
 */
export default async function FinanceiroEmpreendimentoPage({ params }: Props) {
  const empreendimento = await empreendimentoRepo.findById(params.id);
  if (!empreendimento) notFound();

  const dados = await buscarVidaFinanceira(params.id);
  if (!dados) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Empreendimentos", empreendimento.nome, "Financeiro"]}
        title="Vida Financeira"
        description="Panorama de Contas a Receber desse empreendimento — o registro em si é feito no módulo Financeiro."
      />
      <VidaFinanceiraView dados={dados} />
    </div>
  );
}
