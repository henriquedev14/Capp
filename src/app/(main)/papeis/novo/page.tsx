import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PapelForm } from "@/features/papeis/components/papel-form";

export default function NovoPapelPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/papeis"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Papéis
      </Link>
      <PageHeader
        breadcrumb={["Papéis", "Novo papel"]}
        title="Novo papel"
        description="Ex: Diretor, Coordenador, Comercial, Engenharia — defina o nome e quais permissões ele concede."
      />
      <div className="max-w-3xl">
        <PapelForm />
      </div>
    </div>
  );
}
