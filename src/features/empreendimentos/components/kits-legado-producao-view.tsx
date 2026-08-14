import type { KitLegadoView } from "@/features/empreendimentos/actions/legado-actions";

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };

/**
 * Produção do Modo Legado — histórico (antes do ERP) sempre separado
 * de produção real registrada no ERP. Nunca soma os dois num campo
 * só. Desenhado com o Henrique em 13/08/2026.
 */
export function KitsLegadoProducaoView({
  kits,
  entreguePosErpPorKit,
}: {
  kits: KitLegadoView[];
  entreguePosErpPorKit: Record<string, number>;
}) {
  if (kits.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-foreground">Kits contratados (Legado)</p>
      {kits.map((k) => {
        const entregueErp = entreguePosErpPorKit[k.kit] ?? 0;
        const pctHistorico = k.quantidadeContratada > 0 ? (k.quantidadeEntregueHistorico / k.quantidadeContratada) * 100 : 0;
        const pctErp = k.quantidadeContratada > 0 ? (k.quantidadeProduzidaPosErp / k.quantidadeContratada) * 100 : 0;
        const totalEntreguePct = k.quantidadeContratada > 0 ? Math.min(100, ((k.quantidadeEntregueHistorico + entregueErp) / k.quantidadeContratada) * 100) : 0;

        return (
          <div key={k.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-base font-semibold uppercase text-foreground">{LABEL_KIT[k.kit] ?? k.kit}</span>
              <span className="text-lg font-bold tabular-nums text-primary">{Math.round(totalEntreguePct)}%</span>
            </div>

            <div className="mb-2 flex h-5 overflow-hidden rounded border border-border">
              <div className="bg-muted-foreground/40" style={{ width: `${pctHistorico}%` }} title="Histórico" />
              <div className="bg-primary" style={{ width: `${pctErp}%` }} title="Produzido no ERP" />
            </div>
            <div className="mb-3 flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" />
                Histórico (antes do ERP)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
                Produzido no ERP
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div>
                <p className="text-[10px] text-muted-foreground">Contratado</p>
                <p className="text-sm font-semibold tabular-nums">{k.quantidadeContratada}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Histórico entregue</p>
                <p className="text-sm font-semibold tabular-nums text-muted-foreground">{k.quantidadeEntregueHistorico}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Produzido no ERP</p>
                <p className="text-sm font-semibold tabular-nums text-primary">{k.quantidadeProduzidaPosErp}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Entregue no ERP</p>
                <p className="text-sm font-semibold tabular-nums text-primary">{entregueErp}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Saldo restante</p>
                <p className="text-sm font-semibold tabular-nums text-warning">{k.saldoRestante}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
