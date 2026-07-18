export const dynamic = "force-dynamic";

import { Package } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogoPexView } from "@/features/levantamento/components/catalogo-pex-view";
import { prisma } from "@/infra/db/prisma/client";

export default async function MateriaisPexPage() {
  const [total, categorias] = await Promise.all([
    prisma.materialPex.count({ where: { ativo: true } }),
    prisma.materialPex.groupBy({
      by: ["categoria"],
      where: { ativo: true },
      _count: { _all: true },
      orderBy: { categoria: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Orçamentação", "Catálogo PEX"]}
          title="Catálogo de Materiais PEX"
          description="Repositório de conexões e tubos PEX — linha Barbi do Brasil, usado no Levantamento Hidráulico."
        />
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{total} itens cadastrados</span>
        </div>
      </div>

      <CatalogoPexView categorias={categorias.map((c) => ({ nome: c.categoria, total: c._count._all }))} />
    </div>
  );
}
