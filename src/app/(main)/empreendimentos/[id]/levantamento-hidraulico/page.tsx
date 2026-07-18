export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";

import { LevantamentoHidraulicoView } from "@/features/levantamento-hidraulico/components/levantamento-hidraulico-view";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { LevantamentoHidraulicoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-hidraulico-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import type { SubtipoHidraulico } from "@/core/empreendimentos/entities/levantamento-hidraulico";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();
const levantamentoRepo = new LevantamentoHidraulicoPrismaRepository();
const estruturaRepo = new EstruturaFisicaPrismaRepository();

interface Props {
  params: { id: string };
  searchParams: { tipologia?: string; subtipo?: string };
}

export default async function LevantamentoHidraulicoPage({ params, searchParams }: Props) {
  const empreendimento = await empreendimentoRepo.findById(params.id);
  if (!empreendimento) notFound();

  const tipologias = await estruturaRepo.buscarTipologias(params.id);
  const tipologiaId = searchParams.tipologia ?? tipologias[0]?.id;
  const subtipo = (searchParams.subtipo as SubtipoHidraulico) ?? "PEX";

  const levantamento = tipologiaId
    ? await levantamentoRepo.buscar(params.id, tipologiaId, subtipo)
    : null;
  const podeValidar = await temPermissao(PERMISSOES.EMPREENDIMENTO_APROVAR_PROPOSTA);

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

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Levantamento Hidráulico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {empreendimento.nome} — {empreendimento.cidade}/{empreendimento.estado}
        </p>
      </div>

      {tipologias.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Este empreendimento não tem tipologias cadastradas.
          </p>
        </div>
      ) : (
        <LevantamentoHidraulicoView
          empreendimentoId={params.id}
          tipologias={tipologias.map((t) => ({
            id: t.id,
            nome: t.nome,
            areaPrivativa: t.areaPrivativa ? Number(t.areaPrivativa) : null,
            quantidadeUnidades: t.quantidadeUnidades,
          }))}
          tipologiaAtivaId={tipologiaId}
          subtipoAtivo={subtipo}
          levantamento={levantamento}
          podeValidar={podeValidar}
        />
      )}
    </div>
  );
}
