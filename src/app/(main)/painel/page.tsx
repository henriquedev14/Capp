export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";

import { authOptions } from "@/infra/auth/auth-options.full";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { carregarDashboardData } from "@/features/dashboard/lib/queries";
import {
  listarObrasParaDashboardSuprimentos,
  listarUltimasEntradas,
} from "@/features/suprimentos/actions/suprimentos-actions";
import { buscarSegmentacaoCustos, buscarMetasPorArea } from "@/features/financeiro/actions/cadastros-actions";
import {
  listarFilaContasAReceber,
  listarTopClientesDevedores,
  listarFilaContasAPagar,
  calcularResultadoPorEmpresa,
  gerarAlertasFinanceiros,
} from "@/features/financeiro/lib/comando-financeiro";

export default async function PainelPage() {
  const [
    data,
    session,
    obrasSuprimentos,
    ultimasEntradas,
    segmentacaoCustos,
    filaReceber,
    topClientes,
    filaPagar,
    resultadoEmpresas,
    alertasFinanceiros,
    metasPorArea,
  ] = await Promise.all([
    carregarDashboardData(),
    getServerSession(authOptions),
    listarObrasParaDashboardSuprimentos(),
    listarUltimasEntradas(),
    buscarSegmentacaoCustos(),
    listarFilaContasAReceber(),
    listarTopClientesDevedores(),
    listarFilaContasAPagar(),
    calcularResultadoPorEmpresa(),
    gerarAlertasFinanceiros(),
    buscarMetasPorArea(),
  ]);

  const usuarioLogadoId = session?.user?.id ?? null;
  const papeisDoUsuario = session?.user?.papeis ?? [];
  const permissoesDoUsuario = session?.user?.permissoes ?? [];
  const nomeUsuario = session?.user?.nome ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Analytics"]}
        title="Analytics"
        description={
          nomeUsuario
            ? `Bem-vindo, ${nomeUsuario.split(" ")[0]}. Aqui está a visão do negócio.`
            : "Visão geral do negócio da HGI Group."
        }
      />
      <DashboardView
        data={data}
        usuarioLogadoId={usuarioLogadoId}
        papeisDoUsuario={papeisDoUsuario}
        permissoesDoUsuario={permissoesDoUsuario}
        obrasSuprimentos={obrasSuprimentos}
        ultimasEntradas={ultimasEntradas}
        segmentacaoCustos={segmentacaoCustos}
        filaReceber={filaReceber}
        topClientes={topClientes}
        filaPagar={filaPagar}
        resultadoEmpresas={resultadoEmpresas}
        alertasFinanceiros={alertasFinanceiros}
        metasPorArea={metasPorArea}
      />
    </div>
  );
}
