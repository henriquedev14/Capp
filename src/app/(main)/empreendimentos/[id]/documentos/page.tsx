export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { DocumentosEmpreendimento } from "@/features/documentos/components/documentos-empreendimento";
import { listarDocumentosEmpreendimento } from "@/features/documentos/actions/documento-actions";

const empRepo = new EmpreendimentoPrismaRepository();

interface Props {
  params: { id: string };
}

export default async function DocumentosPage({ params }: Props) {
  const empreendimento = await empRepo.findById(params.id);
  if (!empreendimento) notFound();

  let documentos: Awaited<ReturnType<typeof listarDocumentosEmpreendimento>> = [];
  try {
    documentos = await listarDocumentosEmpreendimento(params.id);
  } catch (e) {
    console.error("[documentos/page] erro ao carregar documentos:", e);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/empreendimentos/${params.id}`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para {empreendimento.nome}
      </Link>

      <PageHeader
        breadcrumb={["Empreendimentos", empreendimento.nome, "Documentos"]}
        title="Documentos"
        description="Contratos, plantas, fotos e qualquer arquivo geral do empreendimento."
      />

      <DocumentosEmpreendimento empreendimentoId={params.id} documentos={documentos} />
    </div>
  );
}
