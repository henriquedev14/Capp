export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/infra/db/prisma/client";
import { ContasReceberManager } from "@/features/financeiro/components/contas-receber-manager";

export default async function ContasAReceberPage() {
  const [empresas, contasReceberRaw] = await Promise.all([
    prisma.empresaGrupo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.contaReceber.findMany({
      include: {
        empreendimento: { select: { id: true, nome: true } },
        empresa: true,
        pavimento: { select: { nome: true } },
      },
      orderBy: [{ empreendimentoId: "asc" }, { tipo: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const contasReceber = contasReceberRaw.map((c) => ({
    id: c.id,
    empreendimentoId: c.empreendimento.id,
    empreendimentoNome: c.empreendimento.nome,
    tipo: c.tipo,
    pavimentoNome: c.pavimento?.nome ?? null,
    valor: Number(c.valor),
    dataEnvio: c.dataEnvio ? c.dataEnvio.toISOString() : null,
    dataPrevista: c.dataPrevista ? c.dataPrevista.toISOString() : null,
    recebido: c.recebido,
    empresaId: c.empresaId,
    empresaNome: c.empresa?.nome ?? null,
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
        breadcrumb={["Financeiro", "Contas a Receber"]}
        title="Contas a Receber"
        description="20% de entrada (28 dias após assinatura) + parcelas proporcionais por pavimento entregue, geradas automaticamente ao contratar."
      />

      <ContasReceberManager contas={contasReceber} empresas={empresas} />
    </div>
  );
}
