export const dynamic = "force-dynamic";

import { Package } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogoEletricoView } from "@/features/orcamentacao/components/catalogo-eletrico-view";
import { prisma } from "@/infra/db/prisma/client";

export default async function MateriaisEletricosPage() {
  // Só ativos — inativos ficam invisíveis no catálogo (mesmo critério do PEX).
  // Fabricantes agrupados aqui em vez de por categoria fina, porque no
  // elétrico o corte relevante do negócio é por fornecedor (Nanoplasticos,
  // Wago, Tigre...) — cada um define o padrão do kit.
  const [total, porFabricante] = await Promise.all([
    prisma.materialEletrico.count({ where: { ativo: true } }),
    prisma.materialEletrico.groupBy({
      by: ["fabricante"],
      where: { ativo: true },
      _count: { _all: true },
      orderBy: { fabricante: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Orçamentação", "Catálogo Elétrico"]}
          title="Catálogo de Materiais Elétricos"
          description="Repositório de materiais elétricos e QDC por fabricante — alimenta o Levantamento de Materiais e o Bloco 2 do Orçamento."
        />
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{total} itens cadastrados</span>
        </div>
      </div>

      <CatalogoEletricoView
        fabricantes={porFabricante.map((f) => ({ nome: f.fabricante, total: f._count._all }))}
      />
    </div>
  );
}
