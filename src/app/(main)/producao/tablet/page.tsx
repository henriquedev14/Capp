export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarBancadas, listarOperadores, buscarMetaProducaoDiaria, listarEmpreendimentosParaProducao } from "@/features/producao/actions/producao-actions";
import { TabletProducaoView } from "@/features/producao/components/tablet-producao-view";

export default async function TabletProducaoPage() {
  const podeRegistrar = await temPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  if (!podeRegistrar) redirect("/painel");

  const [bancadas, operadores, metaDiariaUH, empreendimentosRaw] = await Promise.all([
    listarBancadas(),
    listarOperadores(),
    buscarMetaProducaoDiaria(),
    listarEmpreendimentosParaProducao(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/producao"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Produção
      </Link>
      <PageHeader
        breadcrumb={["Produção", "Lançar Produção"]}
        title="Registro de Produção"
        description="Escolha a bancada, o operador, a obra e registre a quantidade produzida."
      />
      <TabletProducaoView
        bancadas={bancadas}
        operadores={operadores}
        empreendimentos={empreendimentosRaw}
        metaDiariaUH={metaDiariaUH}
      />
    </div>
  );
}
