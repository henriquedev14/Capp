export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { listarTransportadorasAction } from "@/features/expedicao/actions/expedicao-actions";
import { TransportadorasManager } from "@/features/expedicao/components/transportadoras-manager";

export default async function TransportadorasPage() {
  const transportadoras = await listarTransportadorasAction();

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
        breadcrumb={["Expedição", "Transportadoras"]}
        title="Transportadoras"
        description="Cadastro de empresas terceirizadas de transporte — opcional, o frete pode ser próprio."
      />
      <div className="flex gap-2 text-sm">
        <Link href="/expedicao/transportadoras" className="font-medium text-primary">
          Transportadoras
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/expedicao/motoristas" className="text-muted-foreground hover:text-foreground">
          Motoristas
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/expedicao/veiculos" className="text-muted-foreground hover:text-foreground">
          Veículos
        </Link>
      </div>
      <TransportadorasManager transportadoras={transportadoras} />
    </div>
  );
}
