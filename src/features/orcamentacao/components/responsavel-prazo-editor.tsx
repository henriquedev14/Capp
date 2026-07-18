"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { User, CalendarClock, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { atribuirResponsavelOrcamento } from "@/features/orcamentacao/actions/jornada-actions";

interface Responsavel {
  id: string;
  nome: string;
}

interface ResponsavelPrazoEditorProps {
  orcamentoId: string;
  empreendimentoId: string;
  responsaveis: Responsavel[];
  responsavelIdAtual: string | null;
  responsavelNomeAtual: string | null;
  dataPrazoAtual: string | null; // ISO date (yyyy-mm-dd) ou null
  podeEditar: boolean;
}

export function ResponsavelPrazoEditor({
  orcamentoId,
  empreendimentoId,
  responsaveis,
  responsavelIdAtual,
  responsavelNomeAtual,
  dataPrazoAtual,
  podeEditar,
}: ResponsavelPrazoEditorProps) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [responsavelId, setResponsavelId] = React.useState(responsavelIdAtual ?? "");
  const [dataPrazo, setDataPrazo] = React.useState(dataPrazoAtual ?? "");

  if (!editando) {
    return (
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          {responsavelNomeAtual ?? <span className="text-muted-foreground/60">Não atribuído</span>}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {dataPrazoAtual ? new Date(dataPrazoAtual).toLocaleDateString("pt-BR") : (
            <span className="text-muted-foreground/60">Sem prazo</span>
          )}
        </span>
        {podeEditar && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditando(true)}>
            <Pencil className="mr-1 h-3 w-3" />
            Editar
          </Button>
        )}
      </div>
    );
  }

  async function salvar() {
    setSalvando(true);
    const resultado = await atribuirResponsavelOrcamento(orcamentoId, empreendimentoId, {
      responsavelId: responsavelId || null,
      dataPrazo: dataPrazo || null,
    });
    setSalvando(false);
    if ("erro" in resultado) {
      alert(resultado.erro);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <select
        value={responsavelId}
        onChange={(e) => setResponsavelId(e.target.value)}
        className="flex h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <option value="">Não atribuído</option>
        {responsaveis.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nome}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={dataPrazo}
        onChange={(e) => setDataPrazo(e.target.value)}
        className="flex h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <Button size="sm" className="h-8 text-xs" disabled={salvando} onClick={salvar}>
        {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        disabled={salvando}
        onClick={() => {
          setResponsavelId(responsavelIdAtual ?? "");
          setDataPrazo(dataPrazoAtual ?? "");
          setEditando(false);
        }}
      >
        Cancelar
      </Button>
    </div>
  );
}
