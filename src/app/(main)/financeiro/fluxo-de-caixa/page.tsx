export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/infra/db/prisma/client";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { projetarFluxoCaixa } from "@/features/financeiro/lib/fluxo-caixa";
import { FluxoCaixaView } from "@/features/financeiro/components/fluxo-caixa-view";

export default async function FluxoCaixaPage() {
  const [configuracao, contasReceber, contasPagar, podeEditar] = await Promise.all([
    prisma.configuracaoSistema.findUnique({ where: { id: "default" } }),
    prisma.contaReceber.findMany({
      where: { recebido: false, dataPrevista: { not: null } },
      select: { valor: true, dataPrevista: true },
    }),
    prisma.contaPagar.findMany({
      where: { pago: false },
      select: { valor: true, dataVencimento: true },
    }),
    temPermissao(PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS),
  ]);

  const semanas = projetarFluxoCaixa({
    entradas: contasReceber
      .filter((c): c is typeof c & { dataPrevista: Date } => c.dataPrevista !== null)
      .map((c) => ({ data: c.dataPrevista, valor: Number(c.valor) })),
    saidas: contasPagar.map((c) => ({ data: c.dataVencimento, valor: Number(c.valor) })),
    saldoInicial: Number(configuracao?.saldoCaixaAtual ?? 0),
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
        saldoAtual={Number(configuracao?.saldoCaixaAtual ?? 0)}
        semanas={semanas}
        podeEditar={podeEditar}
      />
    </div>
  );
}
