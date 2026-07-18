export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { UsuariosTable } from "@/features/usuarios/components/usuarios-table";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";

const repo = new UsuarioPrismaRepository();

export default async function PessoasPage() {
  const usuarios = await repo.findMany();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Pessoas"]}
          title="Pessoas"
          description="Usuários com acesso ao ConstruApp e os papéis atribuídos a cada um."
        />
        <Link href="/pessoas/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        </Link>
      </div>

      <UsuariosTable usuarios={usuarios} />
    </div>
  );
}
