import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Kit {
  kit: string;
  quantidadeTotal: number;
  quantidadeAprovada: number;
  valorContrato: number;
  valorFaturadoInicial: number;
  saldoAReceber: number;
}

/**
 * Card "Vida Financeira" — igual espírito do card de Produção, só que
 * pra empreendimentos em Modo Legado. Lê sempre dos registros de
 * verdade (Ordem de Produção, Conta a Receber), nunca de números
 * soltos. Desenhado com o Henrique em 12-13/08/2026.
 */
export function VidaFinanceiraCard({ empreendimentoId, kits }: { empreendimentoId: string; kits: Kit[] }) {
  if (kits.length === 0) return null;

  return (
    <div className="rounded-xl border border-warning/40 bg-card">
      <div className="flex items-center justify-between border-b border-warning/30 bg-warning/5 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">Vida Financeira</span>
        </div>
        <Link
          href={`/empreendimentos/${empreendimentoId}/editar`}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Editar dados do Legado
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 px-5 py-4 sm:grid-cols-2">
        {kits.map((k) => {
          const faltamProduzir = Math.max(0, k.quantidadeTotal - k.quantidadeAprovada);
          const pctProducao = k.quantidadeTotal > 0 ? Math.min(100, (k.quantidadeAprovada / k.quantidadeTotal) * 100) : 0;
          const faturado = k.valorContrato - k.saldoAReceber;
          const pctFaturado = k.valorContrato > 0 ? Math.min(100, (faturado / k.valorContrato) * 100) : 0;

          return (
            <div key={k.kit} className="rounded-lg border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">{LABEL_KIT[k.kit] ?? k.kit}</p>

              <div className="mb-4">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Produção</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm tabular-nums text-foreground">
                    {k.quantidadeAprovada} / {k.quantidadeTotal} un.
                  </span>
                  <span className="text-xs font-medium text-warning">{faltamProduzir} faltam</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${pctProducao}%` }} />
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Financeiro</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm tabular-nums text-foreground">{formatBRL(faturado)} faturado</span>
                  <span className="text-xs font-medium text-warning">{formatBRL(k.saldoAReceber)} falta</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${pctFaturado}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Contrato: {formatBRL(k.valorContrato)} · Por kit:{" "}
                  {formatBRL(k.quantidadeTotal > 0 ? k.valorContrato / k.quantidadeTotal : 0)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
