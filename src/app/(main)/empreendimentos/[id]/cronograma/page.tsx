export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { listarPavimentosParaCronograma } from "@/features/empreendimentos/actions/cronograma-remessas-actions";
import { CronogramaRemessasCard } from "@/features/empreendimentos/components/cronograma-remessas-card";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();

interface Props {
  params: { id: string };
}

/**
 * Cronograma da Obra — promovido de card (dentro da página principal
 * do Empreendimento) pra aba própria. Pedido pelo Henrique em
 * 10/08/2026 (item 1 da Jornada do Orçamento). A previsão de entrega
 * de cada pavimento alimenta Financeiro, Produção e a trava de
 * Remessa (só libera pra Recebidos quando 100% preenchido).
 */
export default async function CronogramaObraPage({ params }: Props) {
  const empreendimento = await empreendimentoRepo.findById(params.id);
  if (!empreendimento) notFound();

  const linhas = await listarPavimentosParaCronograma(params.id);
  const preenchidas = linhas.filter((l) => l.dataPrevistaRemessa).length;
  const completo = linhas.length > 0 && preenchidas === linhas.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Empreendimentos", empreendimento.nome, "Cronograma da Obra"]}
        title="Cronograma da Obra"
        description="Previsão de entrega de cada pavimento — alimenta Financeiro, Produção e a fábrica automaticamente."
      />

      {linhas.length > 0 && !completo && (
        <div className="rounded-xl bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
          {linhas.length - preenchidas} de {linhas.length} pavimento(s) sem data prevista — remessas não podem ser
          liberadas pra recebimento até o cronograma estar 100% preenchido.
        </div>
      )}

      <CronogramaRemessasCard linhas={linhas} abertoPorPadrao />
    </div>
  );
}
