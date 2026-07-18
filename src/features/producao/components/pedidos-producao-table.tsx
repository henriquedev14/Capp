"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, HelpCircle, FileWarning, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PedidoProducao } from "@/features/producao/lib/pedidos-producao";
import { iniciarProducaoTipologia } from "@/features/suprimentos/actions/suprimentos-actions";

const CONFIG_SITUACAO = {
  OK: { label: "Materiais OK", icone: CheckCircle2, classe: "text-success bg-success/10" },
  FALTANDO: { label: "Faltando material", icone: AlertTriangle, classe: "text-destructive bg-destructive/10" },
  SEM_LEVANTAMENTO: { label: "Sem levantamento validado", icone: FileWarning, classe: "text-warning bg-warning/10" },
  AVULSO_CONFERIR: { label: "Tem item avulso — conferir", icone: HelpCircle, classe: "text-warning bg-warning/10" },
} as const;

function formatData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function PedidosProducaoTable({ pedidos }: { pedidos: PedidoProducao[] }) {
  const router = useRouter();
  const [iniciandoId, setIniciandoId] = React.useState<string | null>(null);

  async function handleIniciarProducao(empreendimentoId: string, tipologiaId: string) {
    const chave = `${empreendimentoId}-${tipologiaId}`;
    setIniciandoId(chave);
    try {
      const r = await iniciarProducaoTipologia(tipologiaId, empreendimentoId);
      if ("erro" in r) {
        alert(r.erro);
        return;
      }
      router.refresh();
    } finally {
      setIniciandoId(null);
    }
  }

  if (pedidos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum empreendimento contratado ainda. Assim que um contrato fechar, aparece aqui automaticamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Pedido</th>
                <th className="px-3 py-2 text-left font-medium">Tipologia</th>
                <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                <th className="px-3 py-2 text-left font-medium">Próx. remessa</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Materiais</th>
                <th className="px-3 py-2 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {pedidos.map((p) => {
                const situacao = CONFIG_SITUACAO[p.situacaoMateriais];
                const Icone = situacao.icone;
                const chave = `${p.empreendimentoId}-${p.tipologiaId}`;
                return (
                  <tr key={chave} className="hover:bg-secondary/20">
                    <td className="px-3 py-2 text-foreground">{p.clienteNome}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/empreendimentos/${p.empreendimentoId}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {p.empreendimentoCodigo} — {p.empreendimentoNome}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.tipologiaNome}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{p.quantidadeUnidades}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatData(p.dataProximaRemessa)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.status}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${situacao.classe}`}>
                        <Icone className="h-3.5 w-3.5" />
                        {situacao.label}
                        {p.situacaoMateriais === "FALTANDO" && ` (${p.itensFaltando})`}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.situacaoMateriais === "OK" ? (
                        <Button
                          size="sm"
                          onClick={() => handleIniciarProducao(p.empreendimentoId, p.tipologiaId)}
                          disabled={iniciandoId === chave}
                        >
                          {iniciandoId === chave && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Iniciar Produção
                        </Button>
                      ) : p.situacaoMateriais === "SEM_LEVANTAMENTO" ? (
                        <Link
                          href={`/empreendimentos/${p.empreendimentoId}/levantamento`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Ir pro Levantamento →
                        </Link>
                      ) : (
                        <Link
                          href={`/empreendimentos/${p.empreendimentoId}/levantamento-materiais`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Ver Materiais →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
