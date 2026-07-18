export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PapeisTable } from "@/features/papeis/components/papeis-table";
import { PapelPrismaRepository } from "@/infra/db/prisma/repositories/papel-prisma-repository";

const repo = new PapelPrismaRepository();

export default async function PapeisPage() {
  const papeis = await repo.findAll();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Papéis"]}
          title="Papéis e Permissões"
          description="Defina os papéis internos da HGI (Diretor, Coordenador, Comercial...) e o que cada um pode acessar."
        />
        <Link href="/papeis/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo papel
          </Button>
        </Link>
      </div>

      <PapeisTable papeis={papeis} />
    </div>
  );
}
