export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarEmpreendimentosParaSuprimentos, listarMateriaisEletricosAtivos } from "@/features/suprimentos/actions/suprimentos-actions";
import { ImportarNotaFiscalView } from "@/features/suprimentos/components/importar-nota-fiscal-view";

export default async function ImportarNotaPage() {
  const podeRegistrar = await temPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  if (!podeRegistrar) redirect("/painel");

  const [empreendimentos, materiais] = await Promise.all([
    listarEmpreendimentosParaSuprimentos(),
    listarMateriaisEletricosAtivos(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Suprimentos", "Importar Nota"]}
        title="Importar Nota Fiscal (PDF)"
        description="Sobe o PDF da nota, confere os itens identificados e confirma a entrada em estoque."
      />
      <ImportarNotaFiscalView empreendimentos={empreendimentos} materiais={materiais} />
    </div>
  );
}
