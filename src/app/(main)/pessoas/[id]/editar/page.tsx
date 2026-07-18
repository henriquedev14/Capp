export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { UsuarioForm } from "@/features/usuarios/components/usuario-form";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { PapelPrismaRepository } from "@/infra/db/prisma/repositories/papel-prisma-repository";

const usuarioRepo = new UsuarioPrismaRepository();
const papelRepo = new PapelPrismaRepository();

export default async function EditarUsuarioPage({ params }: { params: { id: string } }) {
  const [usuario, papeis] = await Promise.all([
    usuarioRepo.findById(params.id),
    papelRepo.findAll(),
  ]);
  if (!usuario) notFound();

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
        breadcrumb={["Pessoas", usuario.nome, "Editar"]}
        title={`Editar usuário: ${usuario.nome}`}
        description={usuario.email}
      />
      <div className="max-w-2xl">
        <UsuarioForm usuario={usuario} papeisDisponiveis={papeis} />
      </div>
    </div>
  );
}
