export const dynamic = "force-dynamic";

import * as React from "react";
import Link from "next/link";
import { Plus, FileText, MoreVertical, Box, ClipboardList, Truck, Navigation, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buscarFilaRemessas } from "@/infra/db/prisma/repositories/expedicao-prisma-repository";
import { CentralExpedicaoClient } from "@/features/expedicao/components/central-expedicao-client";
import { JornadaExpedicaoLegenda } from "@/features/expedicao/components/jornada-expedicao-legenda";
import { cn } from "@/lib/utils";

function IndicadorCard({
  label,
  valor,
  sub,
  icon: Icon,
  destaque = false,
}: {
  label: string;
  valor: number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  destaque?: boolean;
}) {
  return (
    <Card className={cn(destaque && valor > 0 && "border-destructive/40")}>
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            destaque && valor > 0 ? "bg-destructive/10" : "bg-primary/10"
          )}
        >
          <Icon className={cn("h-5 w-5", destaque && valor > 0 ? "text-destructive" : "text-primary")} />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{valor}</span>
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ExpedicaoPage() {
  const { linhas, indicadores } = await buscarFilaRemessas({ visao: "todas" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Operação", "Expedição"]}
          title="Central de Expedição"
          description="Controle de separação, conferência, carregamento e entrega"
        />
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/expedicao/nova">
            <Button>
              <Plus className="h-4 w-4" />
              Nova remessa
            </Button>
          </Link>
          <span title="Romaneio disponível após a liberação do carregamento">
            <Button variant="outline" disabled>
              <FileText className="h-4 w-4" />
              Gerar romaneio
            </Button>
          </span>
          <Button variant="outline">
            <MoreVertical className="h-4 w-4" />
            Mais ações
          </Button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <IndicadorCard label="Remessas do dia" sub="Total de remessas" valor={indicadores.remessasDoDia} icon={Box} />
        <IndicadorCard
          label="Aguardando conferência"
          sub="Para conferir"
          valor={indicadores.aguardandoConferencia}
          icon={ClipboardList}
        />
        <IndicadorCard
          label="Liberadas p/ carregamento"
          sub="Prontas para saída"
          valor={indicadores.liberadasCarregamento}
          icon={Truck}
        />
        <IndicadorCard label="Em rota" sub="Em trânsito" valor={indicadores.emRota} icon={Navigation} />
        <IndicadorCard
          label="Com divergência"
          sub="Requer atenção"
          valor={indicadores.comDivergencia}
          icon={AlertTriangle}
          destaque
        />
      </div>

      {/* Jornada (legenda geral do processo) */}
      <JornadaExpedicaoLegenda />

      <div className="flex gap-3 text-sm">
        <Link href="/expedicao/transportadoras" className="text-muted-foreground hover:text-foreground">
          Transportadoras
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/expedicao/motoristas" className="text-muted-foreground hover:text-foreground">
          Motoristas
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/expedicao/veiculos" className="text-muted-foreground hover:text-foreground">
          Veículos
        </Link>
      </div>

      {/* Tabela + painel de detalhe */}
      <CentralExpedicaoClient linhas={linhas} />
    </div>
  );
}
