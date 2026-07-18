"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  assumirResponsabilidade,
  liberarResponsabilidade,
  concluirEtapaComercial,
  concluirEtapaEngenharia,
  concluirEtapaOrcamentacao,
} from "@/features/empreendimentos/actions/responsabilidade-actions";

type Area = "COMERCIAL" | "ENGENHARIA" | "ORCAMENTACAO";

export interface AreaInfo {
  area: Area;
  label: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  concluidoEm: string | null;
  statusEsperado: string;
}

interface Props {
  empreendimentoId: string;
  statusAtual: string;
  usuarioLogadoId: string | null;
  areas: AreaInfo[];
}

const CONCLUIR_POR_AREA = {
  COMERCIAL: concluirEtapaComercial,
  ENGENHARIA: concluirEtapaEngenharia,
  ORCAMENTACAO: concluirEtapaOrcamentacao,
};

/**
 * Mostra só a área ativa AGORA (bate com o status atual do
 * empreendimento) — nada de listar as 3 áreas o tempo todo. O que já
 * passou fica registrado na Timeline, não precisa duplicar aqui. Uma
 * linha só, discreta, na frente de "Informações gerais".
 */
export function ResponsabilidadeEtapaCard({ empreendimentoId, statusAtual, usuarioLogadoId, areas }: Props) {
  const router = useRouter();
  const [processando, setProcessando] = React.useState(false);

  const areaAtiva = areas.find((a) => a.statusEsperado === statusAtual && !a.concluidoEm);
  if (!areaAtiva) return null;

  const souEu = areaAtiva.responsavelId === usuarioLogadoId;

  async function handleAssumir() {
    setProcessando(true);
    try {
      const r = await assumirResponsabilidade(empreendimentoId, areaAtiva!.area);
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  async function handleLiberar() {
    setProcessando(true);
    try {
      const r = await liberarResponsabilidade(empreendimentoId, areaAtiva!.area);
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  async function handleConcluir() {
    if (!confirm("Concluir essa etapa vai avançar o status do empreendimento automaticamente. Confirma?")) return;
    setProcessando(true);
    try {
      const r = await CONCLUIR_POR_AREA[areaAtiva!.area](empreendimentoId);
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-2.5">
      <span className="text-sm">
        <span className="font-medium text-primary">Na mão de obra do Colaborador:</span>{" "}
        <span className="text-foreground">{areaAtiva.responsavelNome ?? "ninguém assumiu ainda"}</span>
        <span className="ml-1.5 text-xs text-muted-foreground">({areaAtiva.label})</span>
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {souEu ? (
          <button
            onClick={handleLiberar}
            disabled={processando}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
            title="Liberar responsabilidade"
          >
            {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleAssumir} disabled={processando}>
            {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
            Assumir
          </Button>
        )}
        {souEu && (
          <Button size="sm" onClick={handleConcluir} disabled={processando}>
            {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Concluir etapa
          </Button>
        )}
      </div>
    </div>
  );
}
