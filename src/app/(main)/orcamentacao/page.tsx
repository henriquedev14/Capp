export const dynamic = "force-dynamic";

import Link from "next/link";
import * as React from "react";
import { getServerSession } from "next-auth";
import {
  Calculator,
  ArrowRight,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/infra/auth/auth-options.full";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { buscarFilaOrcamentos } from "@/features/orcamentacao/queries/fila-orcamentos";
import { FiltrosFilaOrcamentacao } from "@/features/orcamentacao/components/filtros-fila-orcamentacao";
import { StatusOrcamentoBadge } from "@/features/orcamentacao/components/status-orcamento-badge";
import { EtapaJornadaBadge } from "@/features/orcamentacao/components/etapa-jornada-badge";
import { cn } from "@/lib/utils";
import type { StatusOrcamento } from "@/core/orcamentacao/entities/orcamento";

const usuarioRepo = new UsuarioPrismaRepository();

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

interface Props {
  searchParams: {
    visao?: string;
    responsavel?: string;
    status?: string;
    etapa?: string;
  };
}

export default async function OrcamentacaoHubPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const visao = searchParams.visao ?? "todos";

  const [usuarios, { linhas, indicadores }] = await Promise.all([
    usuarioRepo.findMany(),
    buscarFilaOrcamentos({
      responsavelId: searchParams.responsavel,
      status: searchParams.status as StatusOrcamento | undefined,
      etapa: searchParams.etapa,
      usuarioAtualId: session?.user?.id,
      visao: visao as "minha_fila" | "equipe" | "todos" | "atrasados" | "aguardando_aprovacao",
    }),
  ]);

  const responsaveisAtivos = usuarios
    .filter((u) => u.ativo)
    .map((u) => ({ id: u.id, nome: u.nome }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumb={["Orçamentação"]}
        title="Orçamentação"
        description="Fila de trabalho: levantamentos, cotações e composição de propostas."
      />

      {/* Atalho para Tabela de Preços */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/orcamentacao/precos">
          <Card className="hover:border-primary/40 transition-colors h-full">
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

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <IndicadorCard label="Em andamento" valor={indicadores.emAndamento} icon={Calculator} />
        <IndicadorCard label="Aguard. levantamento" valor={indicadores.aguardandoLevantamento} icon={Clock} />
        <IndicadorCard label="Aguard. cotação" valor={indicadores.aguardandoCotacao} icon={Clock} />
        <IndicadorCard label="Aguard. revisão" valor={indicadores.aguardandoRevisao} icon={Clock} />
        <IndicadorCard label="Aguard. aprovação" valor={indicadores.aguardandoAprovacao} icon={CheckCircle2} />
        <IndicadorCard
          label="Atrasados"
          valor={indicadores.atrasados}
          icon={AlertTriangle}
          destaque={indicadores.atrasados > 0}
        />
        <IndicadorCard
          label="Valor em orçamento"
          valor={formatBRL(indicadores.valorTotalEmOrcamento)}
          icon={Wallet}
        />
      </div>

      {/* Filtros e visões */}
      <FiltrosFilaOrcamentacao
        responsaveis={responsaveisAtivos}
        visaoInicial={visao}
        responsavelInicial={searchParams.responsavel}
        statusInicial={searchParams.status}
        etapaInicial={searchParams.etapa}
      />

      {/* Fila de orçamentos */}
      {linhas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum orçamento encontrado para esse filtro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Empreendimento</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Rev.</th>
                    <th className="px-4 py-3 font-medium">Responsável</th>
                    <th className="px-4 py-3 font-medium">Etapa</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Prazo</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium">Próxima ação</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {linhas.map((l) => (
                    <tr
                      key={l.id}
                      className={cn(
                        "transition-colors hover:bg-secondary/40",
                        l.bloqueado && "bg-destructive/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {l.empreendimentoCodigo}
                            </span>
                            {l.empreendimentoNome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {l.cidade}/{l.estado}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{l.clienteNome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.revisao}</td>
                      <td className="px-4 py-3">
                        {l.responsavelNome ?? (
                          <span className="text-xs text-muted-foreground/60">Não atribuído</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <EtapaJornadaBadge etapa={l.etapaAtual} status={l.etapaStatus} />
                        {l.bloqueado && l.motivoBloqueio && (
                          <div className="mt-1 max-w-[220px] text-[11px] text-destructive">
                            {l.motivoBloqueio}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusOrcamentoBadge status={l.status} />
                      </td>
                      <td className="px-4 py-3">
                        {l.dataPrazo ? (
                          <span className={cn(l.diasAtraso > 0 && "font-medium text-destructive")}>
                            {l.dataPrazo.toLocaleDateString("pt-BR")}
                            {l.diasAtraso > 0 && ` (${l.diasAtraso}d atraso)`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">Sem prazo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {formatBRL(l.totalGeral)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.proximaAcao}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/empreendimentos/${l.empreendimentoId}/orcamento`}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                        >
                          Abrir <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
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
        <span
          className={cn(
            "text-lg font-semibold tabular-nums text-foreground",
            destaque && "text-destructive"
          )}
        >
          {valor}
        </span>
      </CardContent>
    </Card>
  );
}
