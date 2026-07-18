export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarPedidosLiberadosParaProducao } from "@/features/producao/lib/pedidos-producao";
import { PedidosProducaoTable } from "@/features/producao/components/pedidos-producao-table";

export default async function PedidosProducaoPage() {
  const podeVer = await temPermissao(PERMISSOES.PRODUCAO_VER_DASHBOARD);
  if (!podeVer) redirect("/painel");

  const pedidos = await listarPedidosLiberadosParaProducao();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Produção", "Pedidos"]}
        title="Pedidos Liberados para Produção"
        description="Empreendimentos contratados, por tipologia — com data de remessa e situação de materiais."
      />
      <PedidosProducaoTable pedidos={pedidos} />
    </div>
  );
}
