"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GitCommitHorizontal,
  MessageSquare,
  FileText,
  Send,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/empreendimentos/components/status-badge";
import { adicionarAnotacao } from "@/features/empreendimentos/actions/empreendimento-actions";
import type { EventoEmpreendimento } from "@/core/empreendimentos/entities/timeline";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function iconeEvento(tipo: EventoEmpreendimento["tipo"]) {
  switch (tipo) {
    case "MUDANCA_STATUS": return <GitCommitHorizontal className="h-4 w-4" />;
    case "ANOTACAO":       return <MessageSquare className="h-4 w-4" />;
    case "DOCUMENTO":      return <FileText className="h-4 w-4" />;
  }
}

function corIcone(tipo: EventoEmpreendimento["tipo"]): string {
  switch (tipo) {
    case "MUDANCA_STATUS": return "bg-primary/10 text-primary border-primary/20";
    case "ANOTACAO":       return "bg-warning/10 text-warning border-warning/20";
    case "DOCUMENTO":      return "bg-secondary text-muted-foreground border-border";
  }
}

function EventoItem({ evento }: { evento: EventoEmpreendimento }) {
  let meta: { statusAnterior?: string; statusNovo?: string } = {};
  try {
    if (evento.meta) meta = JSON.parse(evento.meta) as typeof meta;
  } catch { /* ignorar erro de parse */ }

  return (
    <div className="flex gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${corIcone(evento.tipo)}`}>
        {iconeEvento(evento.tipo)}
      </div>
      <div className="flex flex-col gap-1.5 pt-0.5 min-w-0 flex-1">
        {evento.tipo === "MUDANCA_STATUS" && meta.statusNovo ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Status alterado para</span>
            <StatusBadge status={meta.statusNovo} />
          </div>
        ) : (
          <p className="text-sm font-medium text-foreground">{evento.titulo}</p>
        )}

        {/* Conteúdo da anotação em destaque */}
        {evento.descricao && (
          <div className={evento.tipo === "ANOTACAO"
            ? "rounded-lg border border-border bg-secondary/50 px-3 py-2.5"
            : ""
          }>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {evento.descricao}
            </p>
          </div>
        )}

        {/* Carimbo: usuário + data/hora */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {evento.usuarioNome && (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-foreground/70">
                <User className="h-3 w-3" />
                {evento.usuarioNome}
              </span>
              <span className="text-muted-foreground/40">·</span>
            </>
          )}
          <span>{formatarData(evento.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

interface TimelineProps {
  empreendimentoId: string;
  eventos: EventoEmpreendimento[];
}

const QTD_RESUMIDA = 3;

export function Timeline({ empreendimentoId, eventos }: TimelineProps) {
  const router = useRouter();
  const [texto, setTexto] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [expandido, setExpandido] = React.useState(false);

  async function handleAdicionar() {
    if (!texto.trim() || enviando) return;
    setErro(null);
    setEnviando(true);
    const resultado = await adicionarAnotacao(empreendimentoId, texto);
    setEnviando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setTexto("");
    router.refresh();
  }

  const temMais = eventos.length > QTD_RESUMIDA;
  const eventosExibidos = expandido ? eventos : eventos.slice(0, QTD_RESUMIDA);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Adicione uma anotação..."
          rows={3}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              void handleAdicionar();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Ctrl+Enter para enviar</span>
          <Button size="sm" onClick={() => void handleAdicionar()} disabled={!texto.trim() || enviando}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Anotar
          </Button>
        </div>
        {erro && <p className="text-xs text-destructive">{erro}</p>}
      </div>

      {eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum evento registrado ainda.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {eventosExibidos.map((evento) => (
              <EventoItem key={evento.id} evento={evento} />
            ))}
          </div>
          {temMais && (
            <button
              onClick={() => setExpandido((v) => !v)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
            >
              {expandido ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Recolher histórico
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Ver histórico completo ({eventos.length} eventos)
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
