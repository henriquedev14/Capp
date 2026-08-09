export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { buscarHubNegociacoes } from "@/features/negociacao/actions/negociacao-actions";
import { NegociacaoHubTable } from "@/features/negociacao/components/negociacao-hub-table";

/**
 * Hub global v2 — painel de gestão de negociações: cards de resumo,
 * filtros por status, ordenação por prioridade. Substitui a lista
 * simples da v1. Desenhado em 08/08/2026 (docs/negociacao-desenho-v2.md).
 */
export default async function NegociacaoHubPage() {
  const podeVer = await temPermissao(PERMISSOES.ORCAMENTO_VER);
  if (!podeVer) redirect("/painel");

  const linhas = await buscarHubNegociacoes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Negociação"]}
        title="Negociação"
        description="Gestão de todas as negociações em aberto — status, prioridade e follow-up."
      />
      <NegociacaoHubTable linhas={linhas} />
    </div>
  );
}
