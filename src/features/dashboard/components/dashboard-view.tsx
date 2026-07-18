"use client";

import * as React from "react";
import {
  BarChart3,
  Briefcase,
  ShieldCheck,
  Wrench,
  FileEdit,
  LayoutDashboard,
  Wallet,
  Package,
  Factory,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PERMISSOES } from "@/core/auth/permissions";
import { ViewDiretor } from "@/features/dashboard/views/view-diretor";
import { ViewCoordenador } from "@/features/dashboard/views/view-coordenador";
import { ViewComercial } from "@/features/dashboard/views/view-comercial";
import { ViewEngenharia } from "@/features/dashboard/views/view-engenharia";
import { ViewOrcamentacao } from "@/features/dashboard/views/view-orcamentacao";
import { ViewFinanceiro } from "@/features/dashboard/views/view-financeiro";
import { ViewSuprimentos } from "@/features/dashboard/views/view-suprimentos";
import { AnalyticsProducaoView } from "@/features/producao/components/analytics-producao-view";
import type { DashboardData } from "@/features/dashboard/lib/queries";

type AbaId = "diretor" | "coordenador" | "comercial" | "engenharia" | "orcamentacao" | "financeiro" | "suprimentos" | "producaoAnalytics";

const ABAS: { id: AbaId; label: string; icon: React.ComponentType<{ className?: string }>; permissao: string }[] = [
  { id: "diretor", label: "Diretoria", icon: BarChart3, permissao: PERMISSOES.DASHBOARD_VER_DIRETORIA },
  { id: "coordenador", label: "Coordenação", icon: ShieldCheck, permissao: PERMISSOES.DASHBOARD_VER_COORDENACAO },
  { id: "comercial", label: "Comercial", icon: Briefcase, permissao: PERMISSOES.DASHBOARD_VER_COMERCIAL },
  { id: "engenharia", label: "Engenharia", icon: Wrench, permissao: PERMISSOES.DASHBOARD_VER_ENGENHARIA },
  { id: "orcamentacao", label: "Orçamentação", icon: FileEdit, permissao: PERMISSOES.DASHBOARD_VER_ORCAMENTACAO },
  { id: "financeiro", label: "Financeiro", icon: Wallet, permissao: PERMISSOES.DASHBOARD_VER_FINANCEIRO },
  { id: "suprimentos", label: "Suprimentos", icon: Package, permissao: PERMISSOES.DASHBOARD_VER_SUPRIMENTOS },
  { id: "producaoAnalytics", label: "Produção", icon: Factory, permissao: PERMISSOES.PRODUCAO_VER_DASHBOARD },
];

// Detecção heurística — bate por nome de papel (case-insensitive, sem acento)
// pra decidir qual aba abrir primeiro, entre as que a pessoa TEM permissão
// de ver. Se nada bater, cai na primeira aba disponível.
function detectarAbaPreferida(papeis: string[], disponiveis: AbaId[]): AbaId | null {
  if (disponiveis.length === 0) return null;
  const normalizado = papeis.map((p) =>
    p
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
  );
  const prioridade: AbaId[] = ["diretor", "coordenador", "comercial", "engenharia", "orcamentacao", "financeiro", "suprimentos", "producaoAnalytics"];
  const termos: Record<AbaId, string[]> = {
    diretor: ["diretor"],
    coordenador: ["coordena"],
    comercial: ["comercial"],
    engenharia: ["engenh"],
    orcamentacao: ["orcament", "orçament"],
    financeiro: ["financ"],
    suprimentos: ["suprim"],
    producaoAnalytics: ["produc", "produç"],
  };
  for (const id of prioridade) {
    if (!disponiveis.includes(id)) continue;
    if (normalizado.some((p) => termos[id].some((t) => p.includes(t)))) return id;
  }
  return disponiveis[0] ?? null;
}

export function DashboardView({
  data,
  usuarioLogadoId,
  papeisDoUsuario,
  permissoesDoUsuario,
  obrasSuprimentos,
  ultimasEntradas,
  segmentacaoCustos,
  filaReceber,
  topClientes,
  filaPagar,
  resultadoEmpresas,
  alertasFinanceiros,
  metasPorArea,
}: {
  data: DashboardData;
  usuarioLogadoId: string | null;
  papeisDoUsuario: string[];
  permissoesDoUsuario: string[];
  obrasSuprimentos: Parameters<typeof ViewSuprimentos>[0]["obras"];
  ultimasEntradas: Parameters<typeof ViewSuprimentos>[0]["ultimasEntradas"];
  segmentacaoCustos: Parameters<typeof ViewFinanceiro>[0]["segmentacaoCustos"];
  filaReceber: Parameters<typeof ViewFinanceiro>[0]["filaReceber"];
  topClientes: Parameters<typeof ViewFinanceiro>[0]["topClientes"];
  filaPagar: Parameters<typeof ViewFinanceiro>[0]["filaPagar"];
  resultadoEmpresas: Parameters<typeof ViewFinanceiro>[0]["resultadoEmpresas"];
  alertasFinanceiros: Parameters<typeof ViewFinanceiro>[0]["alertasFinanceiros"];
  metasPorArea: Parameters<typeof ViewDiretor>[0]["metasPorArea"];
}) {
  const abasDisponiveis = ABAS.filter((a) => permissoesDoUsuario.includes(a.permissao));
  const idsDisponiveis = abasDisponiveis.map((a) => a.id);

  const [aba, setAba] = React.useState<AbaId | null>(() =>
    detectarAbaPreferida(papeisDoUsuario, idsDisponiveis)
  );

  if (abasDisponiveis.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/30 px-6 py-12 text-center">
        <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Nenhum painel disponível pro seu usuário ainda</p>
        <p className="text-xs text-muted-foreground">
          Peça pro Admin liberar o acesso em Papéis, na seção de permissões de Analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de abas — só aparece se houver mais de uma disponível. Estilo
          "underline tabs": mais limpo e discreto que caixinhas com fundo,
          deixa a informação do dashboard ser a protagonista da tela. */}
      {abasDisponiveis.length > 1 && (
        <div className="flex gap-6 border-b border-border">
          {abasDisponiveis.map((a) => {
            const ativa = aba === a.id;
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={cn(
                  "relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
                  ativa ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", ativa ? "text-primary" : "text-muted-foreground")} />
                {a.label}
                {ativa && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Renderiza somente a view ativa — evita cálculo desnecessário */}
      {aba === "diretor" && <ViewDiretor data={data} metasPorArea={metasPorArea} />}
      {aba === "coordenador" && <ViewCoordenador data={data} />}
      {aba === "comercial" && (
        <ViewComercial data={data} usuarioLogadoId={usuarioLogadoId} />
      )}
      {aba === "engenharia" && (
        <ViewEngenharia data={data} usuarioLogadoId={usuarioLogadoId} />
      )}
      {aba === "orcamentacao" && (
        <ViewOrcamentacao data={data} usuarioLogadoId={usuarioLogadoId} />
      )}
      {aba === "financeiro" && (
        <ViewFinanceiro
          data={data}
          segmentacaoCustos={segmentacaoCustos}
          filaReceber={filaReceber}
          topClientes={topClientes}
          filaPagar={filaPagar}
          resultadoEmpresas={resultadoEmpresas}
          alertasFinanceiros={alertasFinanceiros}
        />
      )}
      {aba === "suprimentos" && <ViewSuprimentos obras={obrasSuprimentos} ultimasEntradas={ultimasEntradas} />}
      {aba === "producaoAnalytics" && <AnalyticsProducaoView />}
    </div>
  );
}
