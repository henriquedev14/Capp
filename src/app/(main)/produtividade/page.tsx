export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  podeVerProdutividade,
  buscarProdutividadePorPessoa,
  buscarSaudeGeralEEngenharia,
} from "@/features/produtividade/actions/produtividade-actions";
import { classificarQuadrante, gerarAtencoesDaEquipe } from "@/core/produtividade/use-cases/classificar-quadrante";
import { QuadranteProdutividade } from "@/features/produtividade/components/quadrante-produtividade";
import { SaudeGeral } from "@/features/produtividade/components/saude-geral";
import { TempoDeCiclo } from "@/features/produtividade/components/tempo-de-ciclo";
import { EngenhariaPerformance } from "@/features/produtividade/components/engenharia-performance";

interface Props {
  searchParams: { periodo?: string };
}

function SecaoTitulo({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {texto}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export default async function ProdutividadePage({ searchParams }: Props) {
  const podeVer = await podeVerProdutividade();
  if (!podeVer) redirect("/painel");

  const dias = searchParams.periodo === "7" ? 7 : searchParams.periodo === "90" ? 90 : 30;
  const fim = new Date();
  const inicio = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const [pessoas, saudeGeral] = await Promise.all([
    buscarProdutividadePorPessoa(inicio, fim),
    buscarSaudeGeralEEngenharia(inicio, fim),
  ]);
  const pontos = classificarQuadrante(pessoas);
  const { precisamDeSuporte, destaques } = gerarAtencoesDaEquipe(pontos);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Analytics", "Central de Produtividade"]}
        title="Central de Produtividade"
        description="Saúde geral, tempo de ciclo e visão por pessoa — tudo num só lugar."
      />

      <SecaoTitulo texto="Saúde Geral" />
      <SaudeGeral
        orcamentosParados={saudeGeral.orcamentosParados}
        cotacoesParadas={saudeGeral.cotacoesParadas}
        percentualProducao={saudeGeral.percentualProducao}
        realizadoTotal={saudeGeral.realizadoTotal}
        metaTotal={saudeGeral.metaTotal}
      />

      <SecaoTitulo texto="Tempo Médio de Ciclo" />
      <TempoDeCiclo kpis={saudeGeral.kpisCronologicos} />

      <SecaoTitulo texto="Engenharia — carga e complexidade" />
      <EngenhariaPerformance dados={saudeGeral.engenhariaPerformance} />

      <SecaoTitulo texto="Volume por Pessoa — Comercial e Orçamentação" />
      <QuadranteProdutividade pontos={pontos} precisamDeSuporte={precisamDeSuporte} destaques={destaques} periodoAtual={dias} />
    </div>
  );
}

