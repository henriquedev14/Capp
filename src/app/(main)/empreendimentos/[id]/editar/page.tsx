export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmpreendimentoForm } from "@/features/empreendimentos/components/empreendimento-form";
import { usuariosParaOpcoes } from "@/features/empreendimentos/lib/usuarios-para-opcoes";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();
const clienteRepo = new ClientePrismaRepository();
const usuarioRepo = new UsuarioPrismaRepository();
const estruturaFisicaRepo = new EstruturaFisicaPrismaRepository();

export default async function EditarEmpreendimentoPage({
  params,
}: {
  params: { id: string };
}) {
  const [empreendimento, clientesAtivos, usuarios, torresExistentes, tipologiasExistentes, podeDefinirTier] =
    await Promise.all([
      empreendimentoRepo.findById(params.id),
      clienteRepo.findAtivos(),
      usuarioRepo.findMany(),
      estruturaFisicaRepo.buscarEstrutura(params.id),
      estruturaFisicaRepo.buscarTipologias(params.id),
      temPermissao(PERMISSOES.EMPREENDIMENTO_DEFINIR_TIER),
    ]);

  if (!empreendimento) notFound();

  const opcoesClientes = clientesAtivos.map((c) => ({
    value: c.id,
    label: c.nomeFantasia ?? c.razaoSocial,
    tier: c.tier,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/empreendimentos/${empreendimento.id}`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para {empreendimento.nome}
      </Link>
      <PageHeader
        breadcrumb={["Empreendimentos", empreendimento.nome, "Editar"]}
        title="Editar empreendimento"
        description={empreendimento.nome}
      />
      <div className="max-w-3xl">
        <EmpreendimentoForm
          clientesAtivos={opcoesClientes}
          usuariosAtivos={usuariosParaOpcoes(usuarios)}
          empreendimento={empreendimento}
          torresExistentes={torresExistentes}
          tipologiasExistentes={tipologiasExistentes}
          podeDefinirTier={podeDefinirTier}
        />
      </div>
    </div>
  );
}
