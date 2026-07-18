export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  listarVeiculosAction,
  listarTransportadorasAction,
  listarEmpresasAtivasAction,
} from "@/features/expedicao/actions/expedicao-actions";
import { VeiculosManager } from "@/features/expedicao/components/veiculos-manager";

export default async function VeiculosPage() {
  const [veiculos, transportadoras, empresas] = await Promise.all([
    listarVeiculosAction(),
    listarTransportadorasAction(),
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
      <PageHeader breadcrumb={["Expedição", "Veículos"]} title="Veículos" description="Cadastro de veículos — próprios ou terceirizados." />
      <div className="flex gap-2 text-sm">
        <Link href="/expedicao/transportadoras" className="text-muted-foreground hover:text-foreground">
          Transportadoras
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/expedicao/motoristas" className="text-muted-foreground hover:text-foreground">
          Motoristas
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/expedicao/veiculos" className="font-medium text-primary">
          Veículos
        </Link>
      </div>
      <VeiculosManager veiculos={veiculos} transportadoras={transportadoras} empresas={empresas} />
    </div>
  );
}
