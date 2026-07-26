export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { listarDadosContasAPagar } from "@/features/financeiro/actions/conta-pagar-actions";
import { ContasPagarManager } from "@/features/financeiro/components/contas-pagar-manager";

export default async function ContasAPagarPage() {
  const { empresas, categorias, contas, totalPagoEsteMes } = await listarDadosContasAPagar();

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
        breadcrumb={["Financeiro", "Contas a Pagar"]}
        title="Contas a Pagar"
        description="Contas fixas, parceladas e avulsas — vencidas e previstas. Pagas ficam no histórico."
      />

      <ContasPagarManager
        empresas={empresas}
        categorias={categorias}
        contas={contas}
        totalPagoEsteMes={totalPagoEsteMes}
      />
    </div>
  );
}
