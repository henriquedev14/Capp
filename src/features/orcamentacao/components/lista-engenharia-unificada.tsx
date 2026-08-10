"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tomarPropriedadeDaFila } from "@/features/empreendimentos/actions/fila-levantamento-actions";
import { JornadaBarraSegmentada } from "@/features/orcamentacao/components/jornada-barra-segmentada";
import type { LinhaEngenharia } from "@/features/orcamentacao/queries/fila-engenharia-unificada";

export function ListaEngenhariaUnificada({ linhas }: { linhas: LinhaEngenharia[] }) {
  const router = useRouter();
  const [processandoId, setProcessandoId] = React.useState<string | null>(null);

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

  if (linhas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhum empreendimento em Engenharia agora.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {linhas.map((l, i) => {
        const semResponsavel = !l.responsavelId;
        return (
          <div
            key={l.empreendimentoId}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""} ${
              l.atrasado ? "bg-destructive/5" : semResponsavel ? "bg-primary/5" : ""
            }`}
          >
            <div className="w-[220px] shrink-0">
              <Link href={`/empreendimentos/${l.empreendimentoId}`} className="text-sm font-semibold hover:underline">
                {l.empreendimentoNome}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {l.clienteNome}
                {semResponsavel && " · sem responsável"}
                {!semResponsavel && l.responsavelNome && ` · ${l.responsavelNome}`}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <JornadaBarraSegmentada etapa={l.etapaAtual} status={l.etapaStatus} temOrcamento={l.temOrcamento} />
            </div>

            <div className="w-20 shrink-0 text-right">
              {l.atrasado ? (
                <span className="flex items-center justify-end gap-1 text-[11px] font-semibold text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {l.diasSemAtualizacao}d
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">{l.diasSemAtualizacao}d</span>
              )}
            </div>

            <div className="w-40 shrink-0 text-right">
              {semResponsavel && (
                <Button size="sm" onClick={() => handleTomar(l.empreendimentoId)} disabled={processandoId !== null}>
                  {processandoId === l.empreendimentoId ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Tomar propriedade
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
