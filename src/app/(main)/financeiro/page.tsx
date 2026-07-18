export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Building2,
  Tag,
  Repeat,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  LineChart,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/infra/db/prisma/client";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function FinanceiroPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    empresasCount,
    categoriasCount,
    contasFixasCount,
    contasReceberPendentes,
    contasPagarPendentes,
    recebidoMesAgg,
    pagoMesAgg,
  ] = await Promise.all([
    prisma.empresaGrupo.count({ where: { ativo: true } }),
    prisma.categoriaDespesa.count({ where: { ativo: true } }),
    prisma.contaFixaModelo.count({ where: { ativo: true } }),
    prisma.contaReceber.aggregate({ where: { recebido: false }, _sum: { valor: true }, _count: true }),
    prisma.contaPagar.aggregate({ where: { pago: false }, _sum: { valor: true }, _count: true }),
    prisma.contaReceber.aggregate({
      where: { recebido: true, recebidoEm: { gte: inicioMes } },
      _sum: { valor: true },
    }),
    prisma.contaPagar.aggregate({
      where: { pago: true, pagoEm: { gte: inicioMes } },
      _sum: { valor: true },
    }),
  ]);

  const recebidoMes = Number(recebidoMesAgg._sum.valor ?? 0);
  const pagoMes = Number(pagoMesAgg._sum.valor ?? 0);
  const lucroReal = recebidoMes - pagoMes;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Financeiro"]}
        title="Financeiro"
        description="Saúde financeira do grupo — contas a pagar, contas a receber e cadastros."
      />

      {/* Lucro Real do mês — alerta automático se negativo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs font-medium uppercase tracking-wide text-success">Recebido no mês</span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-success">{formatBRL(recebidoMes)}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium uppercase tracking-wide text-destructive">Pago no mês</span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-destructive">{formatBRL(pagoMes)}</div>
          </CardContent>
        </Card>
        <Card className={lucroReal < 0 ? "border-destructive/60 bg-destructive/10" : "border-primary/40 bg-primary/5"}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2">
              {lucroReal < 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
              <span className={"text-xs font-medium uppercase tracking-wide " + (lucroReal < 0 ? "text-destructive" : "text-primary")}>
                Lucro Real do mês {lucroReal < 0 && "— ATENÇÃO"}
              </span>
            </div>
            <div className={"mt-1 text-2xl font-bold tabular-nums " + (lucroReal < 0 ? "text-destructive" : "text-primary")}>
              {formatBRL(lucroReal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submódulos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/financeiro/fluxo-de-caixa">
          <Card className="hover:border-primary/40 transition-colors h-full border-primary/30">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <LineChart className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Fluxo de Caixa Projetado</span>
                <span className="text-xs text-muted-foreground">Próximas 8 semanas</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro/contas-a-receber">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10">
                <ArrowDownCircle className="h-[18px] w-[18px] text-success" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Contas a Receber</span>
                <span className="text-xs text-muted-foreground">
                  {contasReceberPendentes._count} pendente(s) · {formatBRL(Number(contasReceberPendentes._sum.valor ?? 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro/contas-a-pagar">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <ArrowUpCircle className="h-[18px] w-[18px] text-destructive" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Contas a Pagar</span>
                <span className="text-xs text-muted-foreground">
                  {contasPagarPendentes._count} pendente(s) · {formatBRL(Number(contasPagarPendentes._sum.valor ?? 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro/contas-fixas">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Repeat className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Contas Fixas</span>
                <span className="text-xs text-muted-foreground">{contasFixasCount} regra(s) ativa(s)</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro/empresas">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Building2 className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Empresas do Grupo</span>
                <span className="text-xs text-muted-foreground">{empresasCount} ativa(s)</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro/categorias">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Tag className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Categorias de Despesa</span>
                <span className="text-xs text-muted-foreground">{categoriasCount} ativa(s)</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
