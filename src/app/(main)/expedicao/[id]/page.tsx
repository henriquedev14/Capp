export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusRemessaBadge } from "@/features/expedicao/components/status-remessa-badge";
import { RemessaDetalheTabs } from "@/features/expedicao/components/remessa-detalhe-tabs";
import {
  buscarRemessaDetalheAction,
  buscarHistoricoRemessaAction,
  listarTransportadorasAction,
  listarMotoristasAction,
  listarVeiculosAction,
} from "@/features/expedicao/actions/expedicao-actions";

interface Props {
  params: { id: string };
}

export default async function RemessaDetalhePage({ params }: Props) {
  const remessa = await buscarRemessaDetalheAction(params.id);
  if (!remessa) notFound();

  const [historico, transportadoras, motoristas, veiculos] = await Promise.all([
    buscarHistoricoRemessaAction(params.id),
    listarTransportadorasAction(),
    listarMotoristasAction(remessa.empresaId),
    listarVeiculosAction(remessa.empresaId),
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

      <div className="flex items-center gap-3">
        <PageHeader
          breadcrumb={["Expedição", remessa.numero]}
          title={remessa.numero}
          description={`${remessa.empreendimento.nome} — ${remessa.empreendimento.cidade}/${remessa.empreendimento.estado}`}
        />
        <StatusRemessaBadge status={remessa.status} className="mt-1" />
      </div>

      <RemessaDetalheTabs
        remessa={remessa}
        historico={historico}
        transportadoras={transportadoras}
        motoristas={motoristas}
        veiculos={veiculos}
      />
    </div>
  );
}
