"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { PontoQuadrante } from "@/core/produtividade/use-cases/classificar-quadrante";

const COR_PAPEL: Record<PontoQuadrante["papel"], string> = {
  COMERCIAL: "#2563eb",
  ENGENHARIA: "#9333ea",
  ORCAMENTISTA: "#0d9488",
};

const NOME_PAPEL: Record<PontoQuadrante["papel"], string> = {
  COMERCIAL: "Comercial",
  ENGENHARIA: "Engenharia",
  ORCAMENTISTA: "Orçamentista",
};

interface Props {
  pontos: PontoQuadrante[];
  precisamDeSuporte: PontoQuadrante[];
  destaques: PontoQuadrante[];
  periodoAtual: number;
}

export function QuadranteProdutividade({ pontos, precisamDeSuporte, destaques, periodoAtual }: Props) {
  const router = useRouter();
  const [selecionado, setSelecionado] = React.useState<PontoQuadrante | null>(null);

  // Escala dinâmica dos eixos — pelo menos até 10/5, mas expande se
  // alguém tiver carga/parados acima disso, pra nunca cortar um ponto
  // fora da área visível.
  const maxCarga = Math.max(10, ...pontos.map((p) => p.cargaAtual));
  const maxParados = Math.max(5, ...pontos.map((p) => p.itensParados));

  function trocarPeriodo(dias: number) {
    router.push(`/produtividade?periodo=${dias}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => trocarPeriodo(d)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium ${
              periodoAtual === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {d} dias
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="pt-6">
            <p className="mb-1 text-[15px] font-semibold">🎯 Quem precisa da sua atenção</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Carga de trabalho × itens parados. Clique num ponto pra ver o detalhe.
            </p>

            {pontos.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Sem dados suficientes ainda pra montar o quadrante.
              </div>
            ) : (
              <div
                className="relative mt-1 h-[300px] rounded-lg border border-border"
                style={{
                  background:
                    "linear-gradient(to top right, #edf9ee 0%, #edf9ee 48%, transparent 50%), linear-gradient(to bottom left, #fdedec 0%, #fdedec 48%, transparent 50%)",
                }}
              >
                <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
                <div className="absolute bottom-0 top-0 left-1/2 w-px bg-border" />
                <span className="absolute left-2.5 top-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Ocioso, mas parado
                </span>
                <span className="absolute right-2.5 top-2 text-[10px] font-bold uppercase tracking-wide text-destructive">
                  ⚠ Atenção
                </span>
                <span className="absolute bottom-2 left-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Tranquilo
                </span>
                <span className="absolute bottom-2 right-2.5 text-[10px] font-bold uppercase tracking-wide text-success">
                  Ocupado e em dia
                </span>

                {pontos.map((p) => {
                  const left = Math.min(96, Math.max(4, (p.cargaAtual / maxCarga) * 100));
                  const bottom = Math.min(96, Math.max(4, (p.itensParados / maxParados) * 100));
                  return (
                    <button
                      key={p.usuarioId}
                      onClick={() => setSelecionado(p)}
                      className="absolute flex -translate-x-1/2 translate-y-1/2 flex-col items-center gap-1"
                      style={{ left: `${left}%`, bottom: `${bottom}%` }}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border-2 border-white shadow"
                        style={{ background: COR_PAPEL[p.papel] }}
                      />
                      <span className="whitespace-nowrap text-[10px] font-bold text-foreground">
                        {p.nome.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}

                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-muted-foreground">
                  Carga de trabalho (na mão) →
                </span>
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
                  ↑ Itens parados
                </span>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3.5">
              {(Object.keys(NOME_PAPEL) as PontoQuadrante["papel"][]).map((papel) => (
                <div key={papel} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_PAPEL[papel] }} />
                  {NOME_PAPEL[papel]}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="mb-1 text-[15px] font-semibold">Atenções da equipe nesta semana</p>
            <p className="mb-4 text-xs text-muted-foreground">Gerado a partir do quadrante</p>
            <div className="flex flex-col gap-2.5">
              {precisamDeSuporte.length === 0 && destaques.length === 0 && (
                <p className="text-sm text-muted-foreground">Nada pra destacar agora — time equilibrado.</p>
              )}
              {precisamDeSuporte.map((p) => (
                <button
                  key={p.usuarioId}
                  onClick={() => setSelecionado(p)}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 p-2.5 text-left"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-destructive" />
                  <span className="text-xs">
                    <b className="font-bold">{p.nome}</b>{" "}
                    <span className="text-muted-foreground">
                      — {p.cargaAtual} na mão, {p.itensParados} parado(s)
                    </span>
                  </span>
                </button>
              ))}
              {destaques.map((p) => (
                <button
                  key={p.usuarioId}
                  onClick={() => setSelecionado(p)}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 p-2.5 text-left"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" />
                  <span className="text-xs">
                    <b className="font-bold">{p.nome}</b>{" "}
                    <span className="text-muted-foreground">— {p.produzidoNoPeriodo} entregues no período, acima da média</span>
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selecionado && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: COR_PAPEL[selecionado.papel] }}
                >
                  {selecionado.nome
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-base font-extrabold">{selecionado.nome}</p>
                  <p className="text-xs text-muted-foreground">{NOME_PAPEL[selecionado.papel]}</p>
                </div>
              </div>
              <button onClick={() => setSelecionado(null)} className="text-xs text-muted-foreground hover:text-foreground">
                Fechar ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <p className="text-[10px] font-semibold uppercase text-primary">Na mão</p>
                <p className="mt-0.5 text-xl font-extrabold">{selecionado.cargaAtual}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-2.5">
                <p className="text-[10px] font-semibold uppercase text-success">Produziu ({periodoAtual}d)</p>
                <p className="mt-0.5 text-xl font-extrabold">{selecionado.produzidoNoPeriodo}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-2.5">
                <p className="text-[10px] font-semibold uppercase text-destructive">Parado</p>
                <p className="mt-0.5 text-xl font-extrabold">{selecionado.itensParados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
