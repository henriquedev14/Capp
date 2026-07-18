export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  listarMotoristasAction,
  listarTransportadorasAction,
  listarEmpresasAtivasAction,
} from "@/features/expedicao/actions/expedicao-actions";
import { MotoristasManager } from "@/features/expedicao/components/motoristas-manager";

export default async function MotoristasPage() {
  const [motoristas, transportadoras, empresas] = await Promise.all([
    listarMotoristasAction(),
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
      <PageHeader breadcrumb={["Expedição", "Motoristas"]} title="Motoristas" description="Cadastro de motoristas — próprios ou terceirizados." />
      <div className="flex gap-2 text-sm">
        <Link href="/expedicao/transportadoras" className="text-muted-foreground hover:text-foreground">
          Transportadoras
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/expedicao/motoristas" className="font-medium text-primary">
          Motoristas
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/expedicao/veiculos" className="text-muted-foreground hover:text-foreground">
          Veículos
        </Link>
      </div>
      <MotoristasManager motoristas={motoristas} transportadoras={transportadoras} empresas={empresas} />
    </div>
  );
}
