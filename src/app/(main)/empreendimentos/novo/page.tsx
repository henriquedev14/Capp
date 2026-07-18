export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmpreendimentoForm } from "@/features/empreendimentos/components/empreendimento-form";
import { usuariosParaOpcoes } from "@/features/empreendimentos/lib/usuarios-para-opcoes";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const clienteRepo = new ClientePrismaRepository();
const usuarioRepo = new UsuarioPrismaRepository();

export default async function NovoEmpreendimentoPage() {
  const [clientesAtivos, usuarios, podeDefinirTier] = await Promise.all([
    clienteRepo.findAtivos(),
    usuarioRepo.findMany(),
    temPermissao(PERMISSOES.EMPREENDIMENTO_DEFINIR_TIER),
  ]);

  const opcoesClientes = clientesAtivos.map((c) => ({
    value: c.id,
    label: c.nomeFantasia ?? c.razaoSocial,
    tier: c.tier,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/empreendimentos"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Empreendimentos
      </Link>

      <PageHeader
        breadcrumb={["Empreendimentos", "Novo empreendimento"]}
        title="Novo empreendimento"
        description="Cadastre as informações principais para iniciar o acompanhamento deste empreendimento."
      />

      <EmpreendimentoForm
        clientesAtivos={opcoesClientes}
        usuariosAtivos={usuariosParaOpcoes(usuarios)}
        podeDefinirTier={podeDefinirTier}
      />
    </div>
  );
}
