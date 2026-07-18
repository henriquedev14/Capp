import { PageHeader } from "@/components/layout/page-header";
import { FornecedorForm } from "@/features/fornecedores/components/fornecedor-form";

export default function NovoFornecedorPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumb={["Fornecedores", "Novo"]}
        title="Novo Fornecedor"
        description="Cadastre um fornecedor de materiais ou serviços."
      />
      <FornecedorForm />
    </div>
  );
}
