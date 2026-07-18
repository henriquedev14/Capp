export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Package, TrendingDown, Building2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import {
  listarObrasParaDashboardSuprimentos,
  listarUltimasEntradas,
} from "@/features/suprimentos/actions/suprimentos-actions";
import { listarPedidosCompra, calcularRankingFornecedores } from "@/features/suprimentos/actions/pedido-compra-actions";

export default async function SuprimentosGestaoPage() {
  const podeVer = await temPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  if (!podeVer) redirect("/painel");

  const [obras, ultimasEntradas, pedidos, ranking] = await Promise.all([
    listarObrasParaDashboardSuprimentos(),
    listarUltimasEntradas(),
    listarPedidosCompra(),
    calcularRankingFornecedores(),
  ]);

  const pedidosAtrasados = pedidos.filter((p) => p.atrasado);
  const obrasComPendencia = obras.filter((o) => o.percentualRecebido < 100);
  const mediaRecebido = obras.length > 0 ? obras.reduce((s, o) => s + o.percentualRecebido, 0) / obras.length : 0;
  const fornecedoresComAtraso = ranking.filter((f) => f.pedidosAtrasados > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Suprimentos"]}
        title="Gestão de Suprimentos"
        description="Abastecimento, compras e fornecedores — Almoxarifado e Recebimento unificados aqui."
      />

      {/* Visão executiva */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={pedidosAtrasados.length > 0 ? "border-l-4 border-l-destructive" : "border-l-4 border-l-success"}>
          <CardContent className="pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pedidos atrasados</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${pedidosAtrasados.length > 0 ? "text-destructive" : "text-success"}`}>
              {pedidosAtrasados.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Média recebido (obras ativas)</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{mediaRecebido.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card className={obrasComPendencia.length > 0 ? "border-l-4 border-l-warning" : "border-l-4 border-l-success"}>
          <CardContent className="pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Obras com material pendente</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${obrasComPendencia.length > 0 ? "text-warning" : "text-success"}`}>
              {obrasComPendencia.length}
            </p>
          </CardContent>
        </Card>
        <Card className={fornecedoresComAtraso.length > 0 ? "border-l-4 border-l-warning" : "border-l-4 border-l-success"}>
          <CardContent className="pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fornecedores com atraso</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${fornecedoresComAtraso.length > 0 ? "text-warning" : "text-success"}`}>
              {fornecedoresComAtraso.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Riscos — pedidos atrasados, com link direto */}
      {pedidosAtrasados.length > 0 && (
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="flex flex-col gap-2 pt-5">
            <div className="mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Pedidos de compra atrasados</h2>
            </div>
            {pedidosAtrasados.map((p) => (
              <Link
                key={p.id}
                href="/suprimentos/pedidos"
                className="flex items-center justify-between border-l-2 border-l-destructive bg-destructive/[0.03] px-3 py-2.5 hover:bg-destructive/[0.06]"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.numero} — {p.fornecedorNome}</p>
                  <p className="text-xs text-muted-foreground">{p.empreendimentoNome} · {p.percentualRecebido}% recebido</p>
                </div>
                <span className="text-xs font-medium text-destructive">Cobrar fornecedor</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Abastecimento por obra */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 border-b border-border">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Material recebido por obra</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {obras.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma obra ativa no momento.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {obras.map((o) => (
                  <div key={o.empreendimentoId} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm text-foreground">{o.empreendimentoNome}</span>
                    <div className="relative h-5 flex-1 rounded bg-secondary/60">
                      <div
                        className={`absolute inset-y-0 left-0 rounded ${o.percentualRecebido >= 100 ? "bg-success" : "bg-warning"}`}
                        style={{ width: `${Math.min(o.percentualRecebido, 100)}%`, minWidth: "4px" }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                      {o.percentualRecebido.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking de fornecedores */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 border-b border-border">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Desempenho de fornecedores</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {ranking.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido registrado ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Fornecedor</th>
                      <th className="px-3 py-2 text-right font-medium">Pedidos</th>
                      <th className="px-3 py-2 text-right font-medium">Atrasados</th>
                      <th className="px-3 py-2 text-right font-medium">Atraso médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {ranking.map((f) => (
                      <tr key={f.fornecedorId} className={f.pedidosAtrasados > 0 ? "bg-warning/5" : ""}>
                        <td className="px-3 py-2 text-foreground">{f.nome}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{f.totalPedidos}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-medium ${f.pedidosAtrasados > 0 ? "text-warning" : "text-muted-foreground"}`}>
                          {f.pedidosAtrasados}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {f.diasAtrasoMedio > 0 ? `${f.diasAtrasoMedio}d` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas entradas registradas */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 border-b border-border">
          <Package className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-[15px]">Últimas entradas registradas</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {ultimasEntradas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma entrada registrada ainda.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Material</th>
                    <th className="px-3 py-2 text-left font-medium">Obra</th>
                    <th className="px-3 py-2 text-right font-medium">Quantidade</th>
                    <th className="px-3 py-2 text-left font-medium">Por</th>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {ultimasEntradas.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-foreground">{e.materialNome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.empreendimentoNome}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {e.quantidade.toLocaleString("pt-BR")} {e.unidade}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.registradoPorNome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(e.createdAt).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
