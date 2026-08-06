export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { podeVerProdutividade, buscarProdutividadePorPessoa } from "@/features/produtividade/actions/produtividade-actions";
import { classificarQuadrante, gerarAtencoesDaEquipe } from "@/core/produtividade/use-cases/classificar-quadrante";
import { QuadranteProdutividade } from "@/features/produtividade/components/quadrante-produtividade";

interface Props {
  searchParams: { periodo?: string };
}

export default async function ProdutividadePage({ searchParams }: Props) {
  const podeVer = await podeVerProdutividade();
  if (!podeVer) redirect("/painel");

  const dias = searchParams.periodo === "7" ? 7 : searchParams.periodo === "90" ? 90 : 30;
  const fim = new Date();
  const inicio = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const pessoas = await buscarProdutividadePorPessoa(inicio, fim);
  const pontos = classificarQuadrante(pessoas);
  const { precisamDeSuporte, destaques } = gerarAtencoesDaEquipe(pontos);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Analytics", "Central de Produtividade"]}
        title="Central de Produtividade"
        description="Visão por pessoa — quem está com mais carga, quem está travado. Complementa o Painel principal, não repete."
      />
      <QuadranteProdutividade pontos={pontos} precisamDeSuporte={precisamDeSuporte} destaques={destaques} periodoAtual={dias} />
    </div>
  );
}
