export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/infra/db/prisma/client";
import { CategoriasDespesaComClassificacao } from "@/features/financeiro/components/categorias-despesa-com-classificacao";

export default async function CategoriasDespesaPage() {
  const categorias = await prisma.categoriaDespesa.findMany({ orderBy: { nome: "asc" } });

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
        breadcrumb={["Financeiro", "Categorias de Despesa"]}
        title="Categorias de Despesa"
        description="Ex: Folha de Pagamento, Aluguel, Frete, Impostos. Classifique cada categoria uma vez (comportamento, natureza, apropriação) — alimenta o Dashboard de Custos automaticamente."
      />

      <CategoriasDespesaComClassificacao categoriasIniciais={categorias} />
    </div>
  );
}
