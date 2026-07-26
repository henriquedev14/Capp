export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";

import { PageHeader } from "@/components/layout/page-header";
import { authOptions } from "@/infra/auth/auth-options.full";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { DuploFatorManager } from "@/features/auth/components/duplo-fator-manager";
import { EditarPerfilForm } from "@/features/auth/components/editar-perfil-form";

const usuarioRepo = new UsuarioPrismaRepository();

export default async function PerfilPage() {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) return null;

  const usuario = await usuarioRepo.findById(sessao.user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Perfil"]}
        title="Meu Perfil"
        description="Seus dados e configurações de segurança da sua conta."
      />

      <EditarPerfilForm cargoAtual={usuario?.cargo ?? null} telefoneAtual={usuario?.telefone ?? null} />

      <DuploFatorManager
        ativo={usuario?.duploFatorAtivo ?? false}
        obrigatorio={usuario?.duploFatorObrigatorio ?? false}
      />
    </div>
  );
}
