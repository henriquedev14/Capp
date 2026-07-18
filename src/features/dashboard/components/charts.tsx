"use client";

import * as React from "react";
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  BarChart,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

import { formatBRLCompacto } from "@/features/dashboard/components/kpi";

// Paleta consistente com o resto do sistema — laranja da marca como cor
// primária de destaque, verde/vermelho pra recebido/pago (convenção
// universal de fluxo de caixa que qualquer diretor reconhece na hora).
const COR_PRIMARIA = "#FF731D";
const COR_SUCESSO = "#1F8F5F";
const COR_DESTRUTIVA = "#DC3B3B";
const COR_GRADE = "#E5E1DB";
const COR_TEXTO_EIXO = "#8B8578";

function TooltipCustomizado({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-card-md">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums text-foreground">
            {p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Resultado de Caixa — 6 meses. Área verde (recebido) e vermelha (pago)
 * sobrepostas mostram o "porquê" do resultado, e a linha escura por
 * cima é o saldo do período (recebido − pago). Não é lucro contábil —
 * não desconta custo/despesa por competência, só entrada menos saída.
 * (recebido - pago) — o número que o Diretor realmente quer ver de relance.
 */
export function GraficoLucroReal({
  dados,
}: {
  dados: { mesLabel: string; recebido: number; pago: number; lucro: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRecebido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR_SUCESSO} stopOpacity={0.28} />
            <stop offset="100%" stopColor={COR_SUCESSO} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradPago" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR_DESTRUTIVA} stopOpacity={0.22} />
            <stop offset="100%" stopColor={COR_DESTRUTIVA} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 5" stroke={COR_GRADE} vertical={false} />
        <XAxis
          dataKey="mesLabel"
          tick={{ fontSize: 12, fill: COR_TEXTO_EIXO }}
          axisLine={{ stroke: COR_GRADE }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: COR_TEXTO_EIXO }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatBRLCompacto(v)}
          width={56}
        />
        <Tooltip content={<TooltipCustomizado />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
        <Area
          type="monotone"
          dataKey="recebido"
          name="Recebido"
          stroke={COR_SUCESSO}
          strokeWidth={2}
          fill="url(#gradRecebido)"
        />
        <Area
          type="monotone"
          dataKey="pago"
          name="Pago"
          stroke={COR_DESTRUTIVA}
          strokeWidth={2}
          fill="url(#gradPago)"
        />
        <Line
          type="monotone"
          dataKey="lucro"
          name="Resultado de Caixa"
          stroke="#2B2620"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#2B2620" }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Receita prevista — barras simples, 6 meses à frente. Mais claro que uma
 * linha aqui porque é dinheiro discreto por mês (parcelas previstas), não
 * uma métrica contínua — barra comunica "essa fatia específica" melhor.
 */
export function GraficoReceitaPrevista({
  dados,
}: {
  dados: { mesLabel: string; valor: number; quantidade: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke={COR_GRADE} vertical={false} />
        <XAxis
          dataKey="mesLabel"
          tick={{ fontSize: 12, fill: COR_TEXTO_EIXO }}
          axisLine={{ stroke: COR_GRADE }}
          tickLine={false}
        />
        {/* Eixo esquerdo: valor em R$ (escala de milhares/milhões).
            Eixo direito: quantidade de contas (escala de unidades) —
            duas grandezas bem diferentes no mesmo gráfico, cada uma com
            sua própria régua, pra não achatar a linha de quantidade
            perto de zero. */}
        <YAxis
          yAxisId="valor"
          tick={{ fontSize: 11, fill: COR_TEXTO_EIXO }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatBRLCompacto(v)}
          width={56}
        />
        <YAxis
          yAxisId="quantidade"
          orientation="right"
          tick={{ fontSize: 11, fill: COR_TEXTO_EIXO }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip content={<TooltipCustomizado />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
        <Bar
          yAxisId="valor"
          dataKey="valor"
          name="Receita prevista"
          fill={COR_PRIMARIA}
          radius={[6, 6, 0, 0]}
          maxBarSize={44}
        />
        <Line
          yAxisId="quantidade"
          type="monotone"
          dataKey="quantidade"
          name="Nº de contas"
          stroke="#2B2620"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#2B2620" }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Pipeline por status — barras verticais coloridas por fase, cada uma com
 * a cor real do StatusBadge (consistência visual com o resto do app).
 * Só mostra fases com pelo menos 1 empreendimento, pra não poluir com
 * zeros (ex: ninguém precisa ver "Arquivado: 0" toda vez).
 */
export function GraficoPipeline({
  dados,
  onBarClick,
}: {
  dados: { label: string; value: number; color: string; status?: string }[];
  onBarClick?: (status: string) => void;
}) {
  const comDado = dados.filter((d) => d.value > 0);
  if (comDado.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum empreendimento ativo ainda.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={comDado} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke={COR_GRADE} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: COR_TEXTO_EIXO }}
          axisLine={{ stroke: COR_GRADE }}
          tickLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis tick={{ fontSize: 11, fill: COR_TEXTO_EIXO }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-card-md">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {payload[0]?.value} empreendimento(s){onBarClick ? " — clique pra ver a lista" : ""}
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="value"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
          onClick={(d) => {
            const status = (d as unknown as { status?: string }).status;
            if (onBarClick && status) onBarClick(status);
          }}
          cursor={onBarClick ? "pointer" : "default"}
        >
          {comDado.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Custo Fixo x Variável — donut. Fixo = Contas Fixas (aluguel, folha,
 * contabilidade — existe todo mês, chova ou faça sol). Variável = tudo
 * que depende de obra/produção específica (frete, material, comissão).
 * Essa proporção é um dos números mais importantes pra um Diretor: quanto
 * maior a fatia fixa, menos flexibilidade a empresa tem em mês fraco.
 */
export function GraficoCustoFixoVariavel({ fixo, variavel }: { fixo: number; variavel: number }) {
  const total = fixo + variavel;
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta paga neste mês ainda.</p>;
  }
  const dados = [
    { name: "Custo Fixo", value: fixo, color: COR_DESTRUTIVA },
    { name: "Custo Variável", value: variavel, color: COR_PRIMARIA },
  ];
  const pctFixo = ((fixo / total) * 100).toFixed(0);

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={dados}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={3}
            strokeWidth={0}
          >
            {dados.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipCustomizado />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex shrink-0 flex-col gap-2 pr-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_DESTRUTIVA }} />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Fixo ({pctFixo}%)</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{formatBRLCompacto(fixo)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_PRIMARIA }} />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Variável ({100 - Number(pctFixo)}%)</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{formatBRLCompacto(variavel)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
