export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PlusCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { buscarAcompanhamentoProducao } from "@/features/producao/queries/acompanhamento-producao";
import { AcompanhamentoProducaoView } from "@/features/producao/components/acompanhamento-producao-view";

/**
 * Acompanhamento de Produção — versão real (10/08/2026) da demo
 * estática v6 que tínhamos (velocímetro, tendência, comparativo).
 * Dado 100% real, vindo de contarKitsFinalizados e RegistroProducao.
 * "Registrar produção" leva pra /producao/tablet, que já existe e já
 * é real — não duplicamos o fluxo de registro aqui.
 */
export default async function AcompanhamentoProducaoPage() {
  const podeVer = await temPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  if (!podeVer) redirect("/painel");

  const dados = await buscarAcompanhamentoProducao();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/producao"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Produção
        </Link>
        <Link
          href="/producao/tablet"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Registrar produção
        </Link>
      </div>

      <PageHeader
        breadcrumb={["Produção", "Acompanhamento"]}
        title="Acompanhamento de Produção"
        description="Visão em tempo real pra acompanhar de longe — pensado pra ficar num tablet na fábrica."
      />

      <AcompanhamentoProducaoView dados={dados} />
    </div>
  );
}
