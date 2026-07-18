import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { ProducaoSubNav } from "@/features/producao/components/producao-sub-nav";

export default async function ProducaoLayout({ children }: { children: React.ReactNode }) {
  const [podeVerGestao, podeCorrigir] = await Promise.all([
    temPermissao(PERMISSOES.PRODUCAO_VER_DASHBOARD),
    temPermissao(PERMISSOES.PRODUCAO_CORRIGIR),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <ProducaoSubNav podeVerGestao={podeVerGestao} podeCorrigir={podeCorrigir} />
      {children}
    </div>
  );
}
