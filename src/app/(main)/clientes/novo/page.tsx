import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ClienteForm } from "@/features/clientes/components/cliente-form";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

export default async function NovoClientePage() {
  const podeDefinirTier = await temPermissao(PERMISSOES.CLIENTE_DEFINIR_TIER);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/clientes"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Construtoras
      </Link>
      <PageHeader
        breadcrumb={["Clientes", "Nova construtora"]}
        title="Nova construtora"
        description="Cadastre uma nova construtora parceira da HGI Group."
      />
      <div className="max-w-3xl">
        <ClienteForm podeDefinirTier={podeDefinirTier} />
      </div>
    </div>
  );
}
