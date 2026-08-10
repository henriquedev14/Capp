"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { tomarPropriedadeDaFila } from "@/features/empreendimentos/actions/fila-levantamento-actions";

interface LinhaAguardando {
  empreendimentoId: string;
  empreendimentoNome: string;
  clienteNome: string;
  cidade: string;
  estado: string;
}

/**
 * Fila "Aguardando Levantamento" — demandas que chegaram do Comercial
 * e ainda não têm ninguém tocando. "Tomar Propriedade" aqui é a ÚNICA
 * forma de virar responsável — inicia o relógio de SLA. Item 2 da
 * Jornada do Orçamento, 10/08/2026.
 */
export function FilaAguardandoLevantamento({ linhas }: { linhas: LinhaAguardando[] }) {
  const router = useRouter();
  const [processandoId, setProcessandoId] = React.useState<string | null>(null);

  if (linhas.length === 0) return null;

  async function handleTomar(empreendimentoId: string) {
    setProcessandoId(empreendimentoId);
    try {
      const r = await tomarPropriedadeDaFila(empreendimentoId);
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex-row items-center gap-2.5 border-b border-border">
        <Inbox className="h-4 w-4 text-primary" />
        <CardTitle className="text-[15px]">
          Aguardando Levantamento <span className="text-muted-foreground">({linhas.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-4">
        {linhas.map((l) => (
          <div
            key={l.empreendimentoId}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex flex-col gap-0.5">
              <Link href={`/empreendimentos/${l.empreendimentoId}`} className="text-sm font-semibold hover:underline">
                {l.empreendimentoNome}
              </Link>
              <span className="text-xs text-muted-foreground">
                {l.clienteNome}
                {(l.cidade || l.estado) && ` · ${[l.cidade, l.estado].filter(Boolean).join("/")}`}
              </span>
            </div>
            <Button size="sm" onClick={() => handleTomar(l.empreendimentoId)} disabled={processandoId !== null}>
              {processandoId === l.empreendimentoId ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Tomar Propriedade
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
