"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { STATUS_ORCAMENTO_OPTIONS } from "@/features/orcamentacao/components/status-orcamento-badge";
import { ETAPA_LABEL } from "@/features/orcamentacao/components/etapa-jornada-badge";
import { cn } from "@/lib/utils";

interface Responsavel {
  id: string;
  nome: string;
}

interface FiltrosFilaOrcamentacaoProps {
  responsaveis: Responsavel[];
  visaoInicial: string;
  responsavelInicial?: string;
  statusInicial?: string;
  etapaInicial?: string;
}

const VISOES: { value: string; label: string }[] = [
  { value: "minha_fila", label: "Minha fila" },
  { value: "equipe", label: "Equipe" },
  { value: "todos", label: "Todos" },
  { value: "atrasados", label: "Atrasados" },
  { value: "aguardando_aprovacao", label: "Aguardando minha aprovação" },
];

export function FiltrosFilaOrcamentacao({
  responsaveis,
  visaoInicial,
  responsavelInicial = "",
  statusInicial = "",
  etapaInicial = "",
}: FiltrosFilaOrcamentacaoProps) {
  const router = useRouter();
  const [responsavel, setResponsavel] = React.useState(responsavelInicial);
  const [status, setStatus] = React.useState(statusInicial);
  const [etapa, setEtapa] = React.useState(etapaInicial);

  function aplicar(params: Record<string, string>) {
    const url = new URLSearchParams();
    const merged = { visao: visaoInicial, responsavel, status, etapa, ...params };
    if (merged.visao) url.set("visao", merged.visao);
    if (merged.responsavel) url.set("responsavel", merged.responsavel);
    if (merged.status) url.set("status", merged.status);
    if (merged.etapa) url.set("etapa", merged.etapa);
    const query = url.toString();
    router.push(`/orcamentacao${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {VISOES.map((v) => (
          <Button
            key={v.value}
            variant={visaoInicial === v.value ? "default" : "outline"}
            size="sm"
            onClick={() => aplicar({ visao: v.value })}
            className={cn("h-8 text-xs")}
          >
            {v.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={responsavel}
          onChange={(e) => {
            setResponsavel(e.target.value);
            aplicar({ responsavel: e.target.value });
          }}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer"
        >
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            aplicar({ status: e.target.value });
          }}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer"
        >
          <option value="">Todos os status</option>
          {STATUS_ORCAMENTO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={etapa}
          onChange={(e) => {
            setEtapa(e.target.value);
            aplicar({ etapa: e.target.value });
          }}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer"
        >
          <option value="">Todas as etapas</option>
          {Object.entries(ETAPA_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {(responsavel || status || etapa) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => {
              setResponsavel("");
              setStatus("");
              setEtapa("");
              aplicar({ responsavel: "", status: "", etapa: "" });
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
