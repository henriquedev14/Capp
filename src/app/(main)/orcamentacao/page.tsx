export const dynamic = "force-dynamic";

import Link from "next/link";
import * as React from "react";
import { getServerSession } from "next-auth";
import { Calculator, DollarSign, AlertTriangle, Clock, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/infra/auth/auth-options.full";
import { buscarFilaEngenhariaUnificada } from "@/features/orcamentacao/queries/fila-engenharia-unificada";
import { ListaEngenhariaUnificada } from "@/features/orcamentacao/components/lista-engenharia-unificada";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Hub de Engenharia — redesenhado em 10/08/2026 (lista única, sem
 * "sumiço" entre fila e tabela; jornada calculada do dado real via
 * calcularJornadaReal, não mais de uma tabela manual desatualizada).
 * Ver docs/jornada-orcamento-desenho-completo.md.
 */
export default async function OrcamentacaoHubPage() {
  const podeVer = await temPermissao(PERMISSOES.ORCAMENTO_VER);
  if (!podeVer) redirect("/painel");

  const session = await getServerSession(authOptions);

  // Papel Comercial só vê a própria carteira — mesma regra aplicada em
  // Empreendimentos (achado pelo Henrique em 28/07/2026).
  const restringirAosProprios = await temPermissao(PERMISSOES.EMPREENDIMENTO_VER_APENAS_PROPRIOS);

  const linhas = await buscarFilaEngenhariaUnificada(
    restringirAosProprios ? session?.user?.id : undefined
  );

  const semResponsavel = linhas.filter((l) => !l.responsavelId).length;
  const emAndamento = linhas.filter((l) => l.responsavelId && l.temOrcamento).length;
  const atrasados = linhas.filter((l) => l.atrasado).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumb={["Engenharia"]}
        title="Engenharia"
        description="Todo empreendimento em Engenharia, numa lista só — do recém-chegado do Comercial até a proposta pronta."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/orcamentacao/precos">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="flex items-start gap-3 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <DollarSign className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Tabela de Preços</span>
                <span className="text-xs text-muted-foreground">Preço base e multiplicadores de Tier</span>
                <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  Acessar →
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <IndicadorCard label="Sem responsável" valor={semResponsavel} icon={Clock} destaque={semResponsavel > 0} />
        <IndicadorCard label="Em andamento" valor={emAndamento} icon={Calculator} />
        <IndicadorCard label="Atrasados" valor={atrasados} icon={AlertTriangle} destaque={atrasados > 0} />
        <IndicadorCard label="Total na fila" valor={linhas.length} icon={Wallet} />
      </div>

      <ListaEngenhariaUnificada linhas={linhas} />
    </div>
  );
}

function IndicadorCard({
  label,
  valor,
  icon: Icon,
  destaque = false,
}: {
  label: string;
  valor: number | string;
  icon: React.ComponentType<{ className?: string }>;
  destaque?: boolean;
}) {
  return (
    <Card className={cn(destaque && "border-destructive/40")}>
      <CardContent className="flex flex-col gap-1 p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">{label}</span>
        </div>
        <span className={cn("text-lg font-semibold tabular-nums text-foreground", destaque && "text-destructive")}>
          {valor}
        </span>
      </CardContent>
    </Card>
  );
}
