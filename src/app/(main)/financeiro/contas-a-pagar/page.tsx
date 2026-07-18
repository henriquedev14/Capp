export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/infra/db/prisma/client";
import { ContasPagarManager } from "@/features/financeiro/components/contas-pagar-manager";

export default async function ContasAPagarPage() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

  const [empresas, categorias, contasRaw, agregadoPagasMes] = await Promise.all([
    prisma.empresaGrupo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.categoriaDespesa.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    // Só as pendentes — as pagas saíram daqui e agora vivem em
    // /financeiro/contas-pagas, pra não acumular lixo histórico na tela
    // de trabalho do dia a dia.
    prisma.contaPagar.findMany({
      where: { pago: false },
      include: { empresa: true, categoria: true },
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.contaPagar.aggregate({
      where: { pago: true, pagoEm: { gte: inicioMes, lte: fimMes } },
      _sum: { valor: true },
    }),
  ]);

  const contas = contasRaw.map((c) => ({
    id: c.id,
    descricao: c.descricao,
    tipo: c.tipo,
    valor: Number(c.valor),
    dataVencimento: c.dataVencimento.toISOString(),
    pago: c.pago,
    parcelaAtual: c.parcelaAtual,
    parcelaTotal: c.parcelaTotal,
    empresaNome: c.empresa.nome,
    categoriaNome: c.categoria.nome,
  }));

  const totalPagoEsteMes = Number(agregadoPagasMes._sum.valor ?? 0);

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
