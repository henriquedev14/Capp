export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ClientesTable } from "@/features/clientes/components/clientes-table";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";

const repo = new ClientePrismaRepository();

interface Props {
  searchParams: { busca?: string; status?: string };
}

export default async function ClientesPage({ searchParams }: Props) {
  const ativo =
    searchParams.status === "ativos"
      ? true
      : searchParams.status === "inativos"
      ? false
      : undefined;

  const clientes = await repo.findMany({ busca: searchParams.busca, ativo });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Clientes"]}
          title="Construtoras"
          description="Gerencie as construtoras parceiras da HGI Group."
        />
        <Link href="/clientes/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Nova construtora
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
          <div className="flex gap-1">
            {[
              { label: "Todos", value: "" },
              { label: "Ativas", value: "ativos" },
              { label: "Inativas", value: "inativos" },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={`/clientes?${opt.value ? `status=${opt.value}` : ""}${
                  searchParams.busca ? `&busca=${searchParams.busca}` : ""
                }`}
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
          {clientes.length} {clientes.length === 1 ? "construtora" : "construtoras"}
        </span>
      </div>

      <ClientesTable clientes={clientes} />
    </div>
  );
}
