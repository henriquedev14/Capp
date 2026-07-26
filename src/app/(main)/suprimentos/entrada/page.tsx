export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarEmpreendimentosParaSuprimentos, listarMateriaisEletricosAtivos } from "@/features/suprimentos/actions/suprimentos-actions";
import { SuprimentosView } from "@/features/suprimentos/components/suprimentos-view";
import Link from "next/link";
import { FileUp } from "lucide-react";

export default async function SuprimentosPage() {
  const podeRegistrar = await temPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  if (!podeRegistrar) redirect("/painel");

  const [empreendimentos, materiais] = await Promise.all([
    listarEmpreendimentosParaSuprimentos(),
    listarMateriaisEletricosAtivos(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          breadcrumb={["Suprimentos", "Entrada de Material"]}
          title="Entrada de Material"
          description="Registre o material recebido do fornecedor, vinculado à obra de destino."
        />
        <Link
          href="/suprimentos/importar-nota"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/50"
        >
          <FileUp className="h-4 w-4" />
          Importar Nota (PDF)
        </Link>
      </div>
      <SuprimentosView empreendimentos={empreendimentos} materiais={materiais} />
    </div>
  );
}
