export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/infra/db/prisma/client";
import { ContasFixasManager } from "@/features/financeiro/components/contas-fixas-manager";

export default async function ContasFixasPage() {
  const [empresas, categorias, contasFixasRaw] = await Promise.all([
    prisma.empresaGrupo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.categoriaDespesa.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.contaFixaModelo.findMany({
      include: { empresa: true, categoria: true },
      orderBy: { descricao: "asc" },
    }),
  ]);

  const contasFixas = contasFixasRaw.map((c) => ({
    id: c.id,
    descricao: c.descricao,
    valor: Number(c.valor),
    diaUtilVencimento: c.diaUtilVencimento,
    ativo: c.ativo,
    empresaId: c.empresaId,
    empresaNome: c.empresa.nome,
    categoriaId: c.categoriaId,
    categoriaNome: c.categoria.nome,
    observacoes: c.observacoes,
  }));

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
        breadcrumb={["Financeiro", "Contas Fixas"]}
        title="Contas Fixas Recorrentes"
        description="Regras mensais (aluguel, contabilidade, etc). O lançamento de cada mês é gerado a partir daqui, na tela principal do Financeiro."
      />

      <ContasFixasManager empresas={empresas} categorias={categorias} contasFixas={contasFixas} />
    </div>
  );
}
