export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { prisma } from "@/infra/db/prisma/client";
import { ImportarNotaFiscalView } from "@/features/suprimentos/components/importar-nota-fiscal-view";

export default async function ImportarNotaPage() {
  const podeRegistrar = await temPermissao(PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA);
  if (!podeRegistrar) redirect("/painel");

  const [empreendimentos, materiais] = await Promise.all([
    prisma.empreendimento.findMany({
      where: { status: { in: ["CONTRATADO", "SUPRIMENTOS", "PRODUCAO"] }, excluidoEm: null },
      select: { id: true, nome: true, codigo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.materialEletrico.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, unidade: true },
      orderBy: { nome: "asc" },
    }),
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
