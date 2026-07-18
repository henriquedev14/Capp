"use client";

import Link from "next/link";
import { Wrench, Droplets, Package, CheckCircle2, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/features/dashboard/components/kpi";
import type { DashboardData, LevantamentoResumo } from "@/features/dashboard/lib/queries";

export function ViewEngenharia({
  data,
  usuarioLogadoId,
}: {
  data: DashboardData;
  usuarioLogadoId: string | null;
}) {
  // Filtra empreendimentos onde este usuário é responsável de engenharia
  const meusEmpIds = new Set(
    usuarioLogadoId
      ? data.empreendimentos
          .filter((e) => e.responsavelEngenhariaUserId === usuarioLogadoId)
          .map((e) => e.id)
      : data.empreendimentos.map((e) => e.id)
  );

  const filtroMeu = (l: LevantamentoResumo) => meusEmpIds.has(l.empreendimentoId);

  const eletPend = data.levantamentos.eletrico.filter(
    (l) => l.status !== "VALIDADO" && filtroMeu(l)
  );
  const hidrPend = data.levantamentos.hidraulico.filter(
    (l) => l.status !== "VALIDADO" && filtroMeu(l)
  );
  const matPend = data.levantamentos.materiais.filter(
    (l) => l.status !== "VALIDADO" && filtroMeu(l)
  );

  // Levantamentos validados no mês
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const validadosMes = [
    ...data.levantamentos.eletrico,
    ...data.levantamentos.hidraulico,
    ...data.levantamentos.materiais,
  ].filter(
    (l) => l.status === "VALIDADO" && l.atualizadoEm >= inicioMes && filtroMeu(l)
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Link
          href="/engenharia/tempo-de-ciclo"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/50"
        >
          <Clock className="h-4 w-4" />
          Tempo de ciclo dos levantamentos
        </Link>
      </div>
      {!usuarioLogadoId && (
        <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
          Nenhum usuário identificado — mostrando dados de todos os empreendimentos como
          demonstração.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Elétrico pendente"
          value={eletPend.length}
          hint="levantamentos em rascunho"
          tone={eletPend.length > 3 ? "warning" : "primary"}
          icon={Wrench}
        />
        <KpiCard
          label="Hidráulico pendente"
          value={hidrPend.length}
          hint="levantamentos em rascunho"
          tone={hidrPend.length > 3 ? "warning" : "primary"}
          icon={Droplets}
        />
        <KpiCard
          label="Materiais pendente"
          value={matPend.length}
          hint="levantamentos em rascunho"
          tone={matPend.length > 3 ? "warning" : "primary"}
          icon={Package}
        />
        <KpiCard
          label="Validados este mês"
          value={validadosMes}
          hint="total dos 3 tipos"
          tone="success"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Tempo médio de levantamento"
          value={
            data.kpisCronologicos.engenharia.tempoMedioDias !== null
              ? `${data.kpisCronologicos.engenharia.tempoMedioDias.toFixed(1)} dias`
              : "—"
          }
          hint={
            data.kpisCronologicos.engenharia.amostras > 0
              ? `média de ${data.kpisCronologicos.engenharia.amostras} empreendimento(s)`
              : "ainda sem dado suficiente"
          }
          tone="primary"
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ListaLev titulo="Elétrico" icone={Wrench} itens={eletPend.slice(0, 8)} tipo="levantamento" />
        <ListaLev
          titulo="Hidráulico"
          icone={Droplets}
          itens={hidrPend.slice(0, 8)}
          tipo="levantamento-hidraulico"
        />
        <ListaLev
          titulo="Materiais"
          icone={Package}
          itens={matPend.slice(0, 8)}
          tipo="levantamento-materiais"
        />
      </div>
    </div>
  );
}

function ListaLev({
  titulo,
  icone: Icone,
  itens,
  tipo,
}: {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  itens: LevantamentoResumo[];
  tipo: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 border-b border-border">
        <Icone className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-[15px]">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem pendências.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {itens.map((l) => (
              <Link
                key={l.id}
                href={`/empreendimentos/${l.empreendimentoId}/${tipo}`}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-secondary/40"
              >
                <span className="truncate text-foreground">{l.empreendimentoNome}</span>
                <span className="shrink-0 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning">
                  {l.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
