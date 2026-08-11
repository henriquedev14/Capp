export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ComponentType } from "react";
import { getServerSession } from "next-auth";
import { ClipboardList, CheckCircle2, Clock, RotateCw, AlertTriangle, DollarSign } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { authOptions } from "@/infra/auth/auth-options.full";
import { buscarFilaEngenhariaUnificada } from "@/features/orcamentacao/queries/fila-engenharia-unificada";
import { ListaEngenhariaUnificada } from "@/features/orcamentacao/components/lista-engenharia-unificada";
import { redirect } from "next/navigation";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

/**
 * Central de trabalho da Engenharia — redesenho v4 (10/08/2026),
 * seguindo referência visual enviada pelo Henrique (estilo
 * Linear/Monday). Ver docs/jornada-orcamento-desenho-completo.md.
 */
export default async function OrcamentacaoHubPage() {
  const podeVer = await temPermissao(PERMISSOES.ORCAMENTO_VER);
  if (!podeVer) redirect("/painel");

  const session = await getServerSession(authOptions);
  const restringirAosProprios = await temPermissao(PERMISSOES.EMPREENDIMENTO_VER_APENAS_PROPRIOS);

  const linhas = await buscarFilaEngenhariaUnificada(restringirAosProprios ? session?.user?.id : undefined);

  const semResponsavel = linhas.filter((l) => !l.responsavelId).length;
  const requeremAcao = linhas.filter((l) => l.proximaAcaoAcionavel).length;
  const aguardandoAprovacao = linhas.filter((l) => l.statusBadgeCategoria === "laranja").length;
  const emRevisao = linhas.filter((l) => l.statusBadgeCategoria === "roxo").length;
  const atrasados = linhas.filter((l) => l.atrasado).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          breadcrumb={["Engenharia"]}
          title="Engenharia"
          description="Gerenciamento técnico dos empreendimentos"
        />
        <Link
          href="/orcamentacao/precos"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <DollarSign className="h-3.5 w-3.5" />
          Tabela de preços
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
        <KpiCard icon={ClipboardList} titulo="Em Engenharia" numero={linhas.length} />
        <KpiCard icon={CheckCircle2} titulo="Requerem ação" numero={requeremAcao} destaque />
        <KpiCard icon={Clock} titulo="Aguardando aprovação" numero={aguardandoAprovacao} />
        <KpiCard icon={RotateCw} titulo="Em revisão" numero={emRevisao} />
        <KpiCard icon={AlertTriangle} titulo="Atrasados" numero={atrasados} alerta />
      </div>

      <ListaEngenhariaUnificada linhas={linhas} />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  titulo,
  numero,
  destaque = false,
  alerta = false,
}: {
  icon: ComponentType<{ className?: string }>;
  titulo: string;
  numero: number;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-[#E8EBEF] bg-white p-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px]"
        style={
          alerta
            ? { background: "#FDECEC", color: "#DC3C42" }
            : destaque
              ? { background: "#FFF2E9", color: "#F57C20" }
              : { background: "#F1F3F5", color: "#5E6873" }
        }
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <p className="text-[12px] text-[#5E6873]">{titulo}</p>
        <p className="text-[22px] font-bold leading-tight text-[#1F252D]">{numero}</p>
        <p className="text-[11px] text-[#9099A3]">empreendimentos</p>
      </div>
    </div>
  );
}
