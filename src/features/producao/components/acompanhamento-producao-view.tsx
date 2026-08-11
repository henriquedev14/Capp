"use client";

import type { AcompanhamentoProducao } from "@/features/producao/queries/acompanhamento-producao";

export function AcompanhamentoProducaoView({ dados }: { dados: AcompanhamentoProducao }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-1">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hoje</p>
        <Velocimetro percentual={dados.hoje.percentual} />
        <div className="mt-4 flex items-baseline justify-center gap-2">
          <span className="text-4xl font-bold text-foreground">{dados.hoje.quantidade}</span>
          <span className="text-lg text-muted-foreground">/ {dados.hoje.meta} kits</span>
        </div>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {dados.hoje.percentual >= 1
            ? "Meta batida! 🎉"
            : `Faltam ${Math.max(0, dados.hoje.meta - dados.hoje.quantidade)} kits pra meta de hoje`}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tendência — últimos 7 dias
        </p>
        <GraficoTendencia pontos={dados.tendencia7dias} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-3">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Comparativo entre empreendimentos — mês atual
        </p>
        {dados.comparativoEmpreendimentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum kit finalizado ainda esse mês.</p>
        ) : (
          <ComparativoEmpreendimentos linhas={dados.comparativoEmpreendimentos} />
        )}
      </div>
    </div>
  );
}

function Velocimetro({ percentual }: { percentual: number }) {
  const clamped = Math.min(1, Math.max(0, percentual));
  const raio = 80;
  const circunferencia = Math.PI * raio;
  const dashOffset = circunferencia * (1 - clamped);
  const cor = clamped >= 1 ? "#22C55E" : clamped >= 0.6 ? "#F97316" : "#EF4444";

  return (
    <div className="flex justify-center">
      <svg width="200" height="110" viewBox="0 0 200 110">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={cor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="100" y="90" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--foreground)">
          {Math.round(clamped * 100)}%
        </text>
      </svg>
    </div>
  );
}

function GraficoTendencia({ pontos }: { pontos: { data: string; quantidade: number; meta: number }[] }) {
  if (pontos.length === 0) return <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  const maxValor = Math.max(...pontos.map((p) => Math.max(p.quantidade, p.meta)), 1);
  const largura = 560;
  const altura = 160;
  const passoX = largura / (pontos.length - 1 || 1);

  const pontosLinha = pontos
    .map((p, i) => `${i * passoX},${altura - (p.quantidade / maxValor) * altura}`)
    .join(" ");
  const pontosMeta = pontos.map((p, i) => `${i * passoX},${altura - (p.meta / maxValor) * altura}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={largura} height={altura + 30} viewBox={`0 0 ${largura} ${altura + 30}`}>
        <polyline points={pontosMeta} fill="none" stroke="#d1d5db" strokeWidth="2" strokeDasharray="4 4" />
        <polyline points={pontosLinha} fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {pontos.map((p, i) => (
          <circle key={i} cx={i * passoX} cy={altura - (p.quantidade / maxValor) * altura} r="4" fill="#F97316" />
        ))}
        {pontos.map((p, i) => (
          <text key={i} x={i * passoX} y={altura + 20} textAnchor="middle" fontSize="11" fill="#6b7280">
            {p.data}
          </text>
        ))}
      </svg>
    </div>
  );
}

function ComparativoEmpreendimentos({
  linhas,
}: {
  linhas: { empreendimentoId: string; empreendimentoNome: string; kitsFinalizados: number }[];
}) {
  const max = Math.max(...linhas.map((l) => l.kitsFinalizados), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {linhas.map((l) => (
        <div key={l.empreendimentoId} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm font-medium text-foreground">{l.empreendimentoNome}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(l.kitsFinalizados / max) * 100}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-semibold text-foreground">{l.kitsFinalizados}</span>
        </div>
      ))}
    </div>
  );
}
