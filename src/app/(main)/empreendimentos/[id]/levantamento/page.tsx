export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LevantamentoEletricoView } from "@/features/levantamento/components/levantamento-eletrico-view";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { LevantamentoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();
const levantamentoRepo = new LevantamentoPrismaRepository();
const estruturaRepo = new EstruturaFisicaPrismaRepository();

interface Props {
  params: { id: string };
  searchParams: { tipologia?: string };
}

export default async function LevantamentoPage({ params, searchParams }: Props) {
  const empreendimento = await empreendimentoRepo.findById(params.id);
  if (!empreendimento) notFound();

  const [tipologias, catalogo] = await Promise.all([
    estruturaRepo.buscarTipologias(params.id),
    levantamentoRepo.buscarCatalogo(params.id),
  ]);

  // Seleciona a tipologia ativa (primeira se não especificada)
  const tipologiaId = searchParams.tipologia ?? tipologias[0]?.id;

  const levantamento = tipologiaId
    ? await levantamentoRepo.buscarPorTipologia(params.id, tipologiaId)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={`/empreendimentos/${params.id}`}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para {empreendimento.nome}
        </Link>
        <Link
          href={`/empreendimentos/${params.id}/orcamento`}
          className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <Calculator className="h-4 w-4" />
          Ir para Orçamento
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Levantamento Elétrico</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {empreendimento.nome} — {empreendimento.cidade}/{empreendimento.estado}
          </p>
        </div>
      </div>

      {tipologias.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Este empreendimento não tem tipologias cadastradas.
          </p>
          <Link href={`/empreendimentos/${params.id}/editar`}>
            <Button variant="outline" size="sm" className="mt-3">
              Cadastrar tipologias
            </Button>
          </Link>
        </div>
      ) : (
        <LevantamentoEletricoView
          empreendimentoId={params.id}
          tipologias={tipologias.map((t) => ({
            id: t.id,
            nome: t.nome,
            areaPrivativa: t.areaPrivativa ? Number(t.areaPrivativa) : null,
            quantidadeUnidades: t.quantidadeUnidades,
          }))}
          tipologiaAtivaId={tipologiaId}
          levantamento={levantamento}
          catalogo={catalogo}
        />
      )}
    </div>
  );
}
