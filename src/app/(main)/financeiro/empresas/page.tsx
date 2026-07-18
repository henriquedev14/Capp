export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/infra/db/prisma/client";
import { CadastroSimplesLista } from "@/features/financeiro/components/cadastro-simples-lista";
import {
  criarEmpresaGrupo,
  toggleAtivoEmpresaGrupo,
  excluirEmpresaGrupo,
} from "@/features/financeiro/actions/cadastros-actions";

export default async function EmpresasGrupoPage() {
  const empresas = await prisma.empresaGrupo.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/financeiro"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Financeiro
      </Link>

      <PageHeader
        breadcrumb={["Financeiro", "Empresas do Grupo"]}
        title="Empresas do Grupo"
        description="Ex: ConstruApp Fábrica, ConstruApp Projetos, ConstruApp Uberlândia. Toda conta a pagar pertence a uma dessas empresas."
      />

      <CadastroSimplesLista
        itens={empresas}
        placeholder="Nome da empresa (ex: ConstruApp Projetos)"
        onCriar={criarEmpresaGrupo}
        onToggleAtivo={toggleAtivoEmpresaGrupo}
        onExcluir={excluirEmpresaGrupo}
      />
    </div>
  );
}
