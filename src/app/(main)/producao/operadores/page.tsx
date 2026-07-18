export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarOperadores } from "@/features/producao/actions/producao-actions";
import { OperadoresManager } from "@/features/producao/components/operadores-manager";

export default async function OperadoresPage() {
  const podeRegistrar = await temPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  if (!podeRegistrar) redirect("/painel");

  const operadores = await listarOperadores();

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
        breadcrumb={["Produção", "Operadores"]}
        title="Operadores"
        description="Nomes disponíveis pra escolher na tela de registro de produção. Sem login próprio — é só o nome de quem trabalha na bancada."
      />

      <OperadoresManager operadoresIniciais={operadores} />
    </div>
  );
}
