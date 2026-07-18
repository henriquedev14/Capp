export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmpreendimentosTable } from "@/features/empreendimentos/components/empreendimentos-table";
import { FiltrosEmpreendimentos } from "@/features/empreendimentos/components/filtros-empreendimentos";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import type { StatusEmpreendimento } from "@/core/empreendimentos/entities/empreendimento";

const repo = new EmpreendimentoPrismaRepository();

interface Props {
  searchParams: { busca?: string; status?: string };
}

export default async function EmpreendimentosPage({ searchParams }: Props) {
  const status = searchParams.status as StatusEmpreendimento | undefined;

  const empreendimentos = await repo.findManyResumo({
    busca: searchParams.busca,
    status,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Empreendimentos"]}
          title="Empreendimentos"
          description="Acompanhe todos os empreendimentos da HGI Group, do comercial a entrega."
        />
        <Link href="/empreendimentos/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo empreendimento
          </Button>
        </Link>
      </div>

      <FiltrosEmpreendimentos
        buscaInicial={searchParams.busca}
        statusInicial={searchParams.status}
        total={empreendimentos.length}
      />

      <EmpreendimentosTable empreendimentos={empreendimentos} />
    </div>
  );
}
