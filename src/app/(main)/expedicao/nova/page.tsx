export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { NovaRemessaForm } from "@/features/expedicao/components/nova-remessa-form";
import {
  listarEmpreendimentosParaRemessaAction,
  listarEmpresasAtivasAction,
} from "@/features/expedicao/actions/expedicao-actions";

export default async function NovaRemessaPage() {
  const [empreendimentos, empresas] = await Promise.all([
    listarEmpreendimentosParaRemessaAction(),
    listarEmpresasAtivasAction(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/expedicao"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Expedição
      </Link>
      <PageHeader
        breadcrumb={["Expedição", "Nova remessa"]}
        title="Nova remessa"
        description="Escolha o empreendimento e os itens que vão ser expedidos."
      />
      <NovaRemessaForm empreendimentos={empreendimentos} empresas={empresas} />
    </div>
  );
}
