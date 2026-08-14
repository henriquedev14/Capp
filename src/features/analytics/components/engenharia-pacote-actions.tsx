"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LockKeyhole, Play, Settings2, UserRound } from "lucide-react";
import type { EngenhariaPacoteAnalytics } from "@/features/analytics/lib/types";
import {
  atribuirExecutorPacoteEngenharia,
  bloquearPacoteEngenharia,
  definirPrazoPacoteEngenharia,
  retomarPacoteEngenharia,
} from "@/features/engenharia/actions/controle-produtividade-actions";

export function EngenhariaPacoteAcoes({
  pacote,
  executores,
}: {
  pacote: EngenhariaPacoteAnalytics;
  executores: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [pendente, startTransition] = React.useTransition();
  const [executorId, setExecutorId] = React.useState(pacote.executorId ?? "");
  const [prazo, setPrazo] = React.useState(pacote.prazo ? new Date(pacote.prazo).toISOString().slice(0, 10) : "");
  const [motivo, setMotivo] = React.useState(pacote.motivoBloqueio ?? "");
  const [mensagem, setMensagem] = React.useState<string | null>(null);

  const tipo = pacote.disciplina;
  const executar = (fn: () => Promise<{ ok: true } | { erro: string }>) => {
    setMensagem(null);
    startTransition(async () => {
      const r = await fn();
      if ("erro" in r) setMensagem(r.erro);
      else {
        setMensagem("Atualizado.");
        router.refresh();
      }
    });
  };

  return (
    <div className="min-w-[250px]">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-50"
        disabled={pendente}
      >
        <Settings2 className="h-3.5 w-3.5" /> Gerenciar
      </button>

      {aberto ? (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-secondary/20 p-2.5">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="mb-1 flex items-center gap-1"><UserRound className="h-3 w-3" /> Executor</span>
            <select
              value={executorId}
              onChange={(e) => setExecutorId(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">Usar criador original</option>
              {executores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </label>
          <button
            type="button"
            disabled={pendente}
            onClick={() => executar(() => atribuirExecutorPacoteEngenharia(tipo, pacote.id, executorId || null))}
            className="w-full rounded-md bg-primary px-2 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
          >Salvar executor</button>

          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Prazo do pacote</span>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
          </label>
          <button
            type="button"
            disabled={pendente}
            onClick={() => executar(() => definirPrazoPacoteEngenharia(tipo, pacote.id, prazo ? `${prazo}T23:59:59` : null))}
            className="w-full rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold hover:bg-secondary disabled:opacity-50"
          >Salvar prazo</button>

          {pacote.bloqueado ? (
            <button
              type="button"
              disabled={pendente}
              onClick={() => executar(() => retomarPacoteEngenharia(tipo, pacote.id))}
              className="flex w-full items-center justify-center gap-1 rounded-md bg-success/10 px-2 py-1.5 text-[11px] font-semibold text-success disabled:opacity-50"
            ><Play className="h-3.5 w-3.5" /> Retomar pacote</button>
          ) : (
            <>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo do bloqueio: aguardando documento, cliente, informação..."
                className="min-h-16 w-full rounded-md border border-input bg-background p-2 text-xs"
              />
              <button
                type="button"
                disabled={pendente || !motivo.trim()}
                onClick={() => executar(() => bloquearPacoteEngenharia(tipo, pacote.id, motivo))}
                className="flex w-full items-center justify-center gap-1 rounded-md bg-warning/10 px-2 py-1.5 text-[11px] font-semibold text-warning disabled:opacity-50"
              ><LockKeyhole className="h-3.5 w-3.5" /> Registrar bloqueio</button>
            </>
          )}
          {mensagem ? <p className="text-[10px] text-muted-foreground">{mensagem}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
