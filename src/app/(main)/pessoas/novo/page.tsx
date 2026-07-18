export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { UsuarioForm } from "@/features/usuarios/components/usuario-form";
import { PapelPrismaRepository } from "@/infra/db/prisma/repositories/papel-prisma-repository";

const papelRepo = new PapelPrismaRepository();

export default async function NovoUsuarioPage() {
  const papeis = await papelRepo.findAll();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/pessoas"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Pessoas
      </Link>
      <PageHeader
        breadcrumb={["Pessoas", "Novo usuário"]}
        title="Novo usuário"
        description="Cadastre um novo membro da equipe e defina quais papéis ele terá."
      />
      <div className="max-w-2xl">
        <UsuarioForm papeisDisponiveis={papeis} />
      </div>
    </div>
  );
}
