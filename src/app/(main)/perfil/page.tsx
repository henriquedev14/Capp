export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";

import { PageHeader } from "@/components/layout/page-header";
import { authOptions } from "@/infra/auth/auth-options.full";
import { prisma } from "@/infra/db/prisma/client";
import { DuploFatorManager } from "@/features/auth/components/duplo-fator-manager";
import { EditarPerfilForm } from "@/features/auth/components/editar-perfil-form";

export default async function PerfilPage() {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.user.id },
    select: { duploFatorAtivo: true, duploFatorObrigatorio: true, cargo: true, telefone: true },
  });

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
