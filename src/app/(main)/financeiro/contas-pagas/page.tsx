export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/infra/db/prisma/client";
import { ContasPagasHistorico } from "@/features/financeiro/components/contas-pagas-historico";

export default async function ContasPagasPage() {
  const contasRaw = await prisma.contaPagar.findMany({
    where: { pago: true },
    include: { empresa: true, categoria: true },
    orderBy: { dataVencimento: "desc" },
  });

  const contas = contasRaw.map((c) => ({
    id: c.id,
    descricao: c.descricao,
    tipo: c.tipo,
    valor: Number(c.valor),
    dataVencimento: c.dataVencimento.toISOString(),
    pagoEm: c.pagoEm ? c.pagoEm.toISOString() : null,
    parcelaAtual: c.parcelaAtual,
    parcelaTotal: c.parcelaTotal,
    empresaNome: c.empresa.nome,
    categoriaNome: c.categoria.nome,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/financeiro/contas-a-pagar"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Contas a Pagar
      </Link>

      <PageHeader
        breadcrumb={["Financeiro", "Contas a Pagar", "Contas Pagas"]}
        title="Contas Pagas"
        description="Histórico de contas já quitadas, agrupado por mês de referência."
      />

      <ContasPagasHistorico contas={contas} />
    </div>
  );
}
