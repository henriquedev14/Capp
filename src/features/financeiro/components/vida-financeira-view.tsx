import type { VidaFinanceira } from "@/features/financeiro/queries/vida-financeira";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const LABEL_TIPO: Record<string, string> = { ENTRADA: "Entrada", REMESSA: "Remessa" };

/**
 * "Vida Financeira" — panorama de Contas a Receber de QUALQUER
 * empreendimento. Mesmo espírito visual do card de Produção. Pedido
 * pelo Henrique em 13/08/2026.
 */
export function VidaFinanceiraView({ dados }: { dados: VidaFinanceira }) {
  const pctRecebido = dados.totalContratado > 0 ? Math.min(100, (dados.totalRecebido / dados.totalContratado) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valor total</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{formatBRL(dados.totalContratado)}</p>
          {dados.contrato && (
            <p className="mt-1 text-xs text-muted-foreground">
              Contrato {dados.contrato.numero} · {dados.contrato.empresaGrupoNome}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-success/30 bg-success/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-success">Já recebido</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-success">{formatBRL(dados.totalRecebido)}</p>
          <div className="mt-2 h-1.5 rounded-full bg-success/15">
            <div className="h-full rounded-full bg-success" style={{ width: `${pctRecebido}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-warning">Saldo a receber</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-warning">{formatBRL(dados.saldoAReceber)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">Contas a Receber ({dados.contas.length})</p>
        </div>

        {dados.contas.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma Conta a Receber ainda pra esse empreendimento.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Tipo</th>
                <th className="px-2 py-2 text-left font-medium">Referência</th>
                <th className="px-2 py-2 text-left font-medium">Previsão</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {dados.contas.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5">{LABEL_TIPO[c.tipo] ?? c.tipo}</td>
                  <td className="px-2 py-2.5 text-muted-foreground">{c.pavimentoNome ?? "—"}</td>
                  <td className="px-2 py-2.5 text-muted-foreground">
                    {c.dataPrevista ? formatData(c.dataPrevista) : "Aguardando"}
                  </td>
                  <td className="px-2 py-2.5">
                    {c.recebido ? (
                      <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Recebido {c.recebidoEm ? formatData(c.recebidoEm) : ""}
                      </span>
                    ) : (
                      <span className="rounded-md bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                        Pendente
                      </span>
                    )}
                    {c.temBoleto && <span className="ml-1.5 text-xs text-muted-foreground">📎</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatBRL(c.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
