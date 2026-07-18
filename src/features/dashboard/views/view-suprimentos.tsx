"use client";

import Link from "next/link";
import { PackageCheck, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ObraSuprimentos } from "@/features/suprimentos/actions/suprimentos-actions";

interface UltimaEntrada {
  id: string;
  materialNome: string;
  unidade: string;
  quantidade: number;
  empreendimentoNome: string;
  registradoPorNome: string;
  createdAt: Date;
}

function formatData(d: Date): string {
  return new Date(d).toLocaleDateString("pt-BR");
}

export function ViewSuprimentos({
  obras,
  ultimasEntradas,
}: {
  obras: ObraSuprimentos[];
  ultimasEntradas: UltimaEntrada[];
}) {
  const obrasComPendencia = obras.filter((o) => o.percentualRecebido < 100);
  const mediaRecebido =
    obras.length > 0 ? obras.reduce((s, o) => s + o.percentualRecebido, 0) / obras.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Média de material recebido (obras ativas)
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{mediaRecebido.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className={obrasComPendencia.length > 0 ? "border-warning/40 bg-warning/5" : ""}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Obras com pendência</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-warning">{obrasComPendencia.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 border-b border-border">
          <PackageCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-[15px]">Material recebido por obra</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {obras.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma obra ativa no momento.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {obras.map((o) => (
                <Link
                  key={o.empreendimentoId}
                  href={`/suprimentos?obra=${o.empreendimentoId}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary/30"
                >
                  <span className="w-48 shrink-0 truncate text-sm text-foreground">{o.empreendimentoNome}</span>
                  <div className="relative h-5 flex-1 rounded bg-secondary/60">
                    <div
                      className={`absolute inset-y-0 left-0 rounded transition-all ${
                        o.percentualRecebido >= 100 ? "bg-success" : "bg-warning"
                      }`}
                      style={{ width: `${Math.min(o.percentualRecebido, 100)}%`, minWidth: "4px" }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                    {o.percentualRecebido.toFixed(0)}%
                  </span>
                  {o.itensComPendencia > 0 && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {o.itensComPendencia}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Últimas entradas registradas</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {ultimasEntradas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma entrada registrada ainda.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Material</th>
                    <th className="px-3 py-2 text-left font-medium">Obra</th>
                    <th className="px-3 py-2 text-right font-medium">Quantidade</th>
                    <th className="px-3 py-2 text-left font-medium">Por</th>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {ultimasEntradas.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-foreground">{e.materialNome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.empreendimentoNome}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {e.quantidade.toLocaleString("pt-BR")} {e.unidade}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.registradoPorNome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatData(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
