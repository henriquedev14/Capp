export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarBancadas, listarOperadores } from "@/features/producao/actions/producao-actions";
import { TerminalProducaoView } from "@/features/producao/components/terminal-producao-view";

/**
 * Terminal de Produção — implementação real do terminal_producao_hgi.html
 * que o Henrique enviou como referência (10/08/2026). Cada tablet fica
 * fixo numa bancada (pareado uma vez, guardado no aparelho). Fluxo real
 * de Ordem de Produção: OP nasce sozinha, cronômetro roda de verdade,
 * contadores de aprovado/retrabalho/perda em tempo real.
 */
export default async function TerminalProducaoPage() {
  const podeRegistrar = await temPermissao(PERMISSOES.PRODUCAO_REGISTRAR);
  if (!podeRegistrar) redirect("/painel");

  const [bancadas, operadores] = await Promise.all([listarBancadas(), listarOperadores()]);

  return <TerminalProducaoView bancadas={bancadas} operadores={operadores} />;
}
