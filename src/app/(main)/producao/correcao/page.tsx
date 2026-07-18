export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarRegistrosRecentes } from "@/features/producao/actions/producao-actions";
import { CorrecaoProducaoManager } from "@/features/producao/components/correcao-producao-manager";

export default async function CorrecaoProducaoPage() {
  const podeCorrigir = await temPermissao(PERMISSOES.PRODUCAO_CORRIGIR);
  if (!podeCorrigir) redirect("/painel");

  const registros = await listarRegistrosRecentes(7);

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
        breadcrumb={["Produção", "Correção"]}
        title="Correção de Registros"
        description="Últimos 7 dias — edite a quantidade de unidades concluídas de um registro lançado errado, ou exclua se necessário."
      />

      <CorrecaoProducaoManager registrosIniciais={registros} />
    </div>
  );
}
