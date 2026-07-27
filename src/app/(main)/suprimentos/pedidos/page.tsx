export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarPedidosCompra, listarCotacoesAceitasSemPedido } from "@/features/suprimentos/actions/pedido-compra-actions";
import { PedidosCompraManager } from "@/features/suprimentos/components/pedidos-compra-manager";

export default async function PedidosCompraPage() {
  const podeVer = await temPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  if (!podeVer) redirect("/painel");

  const [pedidos, cotacoesAceitasSemPedido] = await Promise.all([
    listarPedidosCompra(),
    listarCotacoesAceitasSemPedido(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Suprimentos", "Pedidos de Compra"]}
        title="Pedidos de Compra"
        description="O elo entre a cotação aceita e o material que realmente chega — compara pedido × recebido."
      />
      <PedidosCompraManager pedidosIniciais={pedidos} cotacoesAceitasSemPedido={cotacoesAceitasSemPedido} />
    </div>
  );
}
