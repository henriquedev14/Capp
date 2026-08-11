export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { buscarVidaProducaoV2 } from "@/features/producao/queries/vida-producao-v2";
import { VidaProducaoView } from "@/features/producao/components/vida-producao-view";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();

interface Props {
  params: { id: string };
}

/**
 * "Vida da Produção" v2 — replica o visual de
 * producao-empreendimento-demo-v6.html com dado real. Confirmado com
 * o Henrique em 11/08/2026: granularidade por Tipologia (não por kit
 * individual), registro continua sendo feito só no tablet físico.
 */
export default async function ProducaoEmpreendimentoPage({ params }: Props) {
  const empreendimento = await empreendimentoRepo.findById(params.id);
  if (!empreendimento) notFound();

  const dados = await buscarVidaProducaoV2(params.id);
  if (!dados) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Empreendimentos", empreendimento.nome, "Produção"]}
        title="Vida da Produção"
        description="Panorama de como esse empreendimento está indo pelas bancadas — o registro em si é feito no tablet de cada estação."
      />
      <VidaProducaoView dados={dados} />
    </div>
  );
}
