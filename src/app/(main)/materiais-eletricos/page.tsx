export const dynamic = "force-dynamic";

import { Package } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogoEletricoView } from "@/features/orcamentacao/components/catalogo-eletrico-view";
import { buscarResumoCatalogoEletrico } from "@/features/orcamentacao/actions/precos-actions";

export default async function MateriaisEletricosPage() {
  const { total, fabricantes: porFabricante } = await buscarResumoCatalogoEletrico();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Engenharia", "Catálogo Elétrico"]}
          title="Catálogo de Materiais Elétricos"
          description="Repositório de materiais elétricos e QDC por fabricante — alimenta o Levantamento de Materiais e o Bloco 2 do Orçamento."
        />
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{total} itens cadastrados</span>
        </div>
      </div>

      <CatalogoEletricoView
        fabricantes={porFabricante}
      />
    </div>
  );
}
