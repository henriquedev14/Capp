export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { FornecedoresTable } from "@/features/fornecedores/components/fornecedores-table";
import { FornecedorPrismaRepository } from "@/infra/db/prisma/repositories/fornecedor-prisma-repository";
import { TIPOS_FORNECEDOR } from "@/features/fornecedores/schemas/fornecedor-schema";
import type { TipoFornecedor } from "@/core/fornecedores/entities/fornecedor";

const repo = new FornecedorPrismaRepository();

interface Props {
  searchParams: { busca?: string; status?: string; tipo?: string };
}

export default async function FornecedoresPage({ searchParams }: Props) {
  const ativo =
    searchParams.status === "ativos"
      ? true
      : searchParams.status === "inativos"
      ? false
      : undefined;

  const tipoValido = TIPOS_FORNECEDOR.find((t) => t.value === searchParams.tipo);

  const fornecedores = await repo.findMany({
    busca: searchParams.busca,
    ativo,
    tipo: tipoValido?.value as TipoFornecedor | undefined,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Fornecedores"]}
          title="Fornecedores"
          description="Gerencie os fornecedores de materiais e serviços da HGI Group."
        />
        <Link href="/fornecedores/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo fornecedor
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex flex-1 items-center gap-3" method="GET">
          <input
            type="text"
            name="busca"
            defaultValue={searchParams.busca}
            placeholder="Buscar por nome ou CNPJ..."
            className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm shadow-card-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
          {/* Filtro status */}
          <div className="flex gap-1">
            {[
              { label: "Todos", value: "" },
              { label: "Ativos", value: "ativos" },
              { label: "Inativos", value: "inativos" },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={`/fornecedores?${opt.value ? `status=${opt.value}` : ""}${
                  searchParams.busca ? `&busca=${searchParams.busca}` : ""
                }${searchParams.tipo ? `&tipo=${searchParams.tipo}` : ""}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  (searchParams.status ?? "") === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
          <Button type="submit" variant="outline" size="sm">
            Buscar
          </Button>
        </form>
        <span className="text-sm text-muted-foreground">
          {fornecedores.length}{" "}
          {fornecedores.length === 1 ? "fornecedor" : "fornecedores"}
        </span>
      </div>

      <FornecedoresTable fornecedores={fornecedores} />
    </div>
  );
}
