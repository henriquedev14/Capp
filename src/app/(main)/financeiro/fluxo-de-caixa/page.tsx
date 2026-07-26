export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { projetarFluxoCaixa } from "@/features/financeiro/lib/fluxo-caixa";
import { buscarDadosFluxoCaixa } from "@/features/financeiro/actions/fluxo-caixa-actions";
import { FluxoCaixaView } from "@/features/financeiro/components/fluxo-caixa-view";

export default async function FluxoCaixaPage() {
  const { saldoCaixaAtual, contasReceber, contasPagar, podeEditar } = await buscarDadosFluxoCaixa();

  const semanas = projetarFluxoCaixa({
    entradas: contasReceber,
    saidas: contasPagar,
    saldoInicial: saldoCaixaAtual,
    numSemanas: 8,
  });

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
        breadcrumb={["Financeiro", "Fluxo de Caixa"]}
        title="Fluxo de Caixa Projetado"
        description="Cruza o que está previsto pra entrar (Contas a Receber) com o que está previsto pra sair (Contas a Pagar), semana a semana, pelas próximas 8 semanas."
      />

      <FluxoCaixaView
        saldoAtual={saldoCaixaAtual}
        semanas={semanas}
        podeEditar={podeEditar}
      />
    </div>
  );
}
