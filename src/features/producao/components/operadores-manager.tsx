"use client";

import * as React from "react";
import { Loader2, Plus, Pencil, X, Trash2, Phone, BadgeCheck, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { criarOperador, editarOperador, inativarOperador, type DadosOperador } from "@/features/producao/actions/producao-actions";
import type { OperadorProducao } from "@/core/producao/entities/producao";

/**
 * Mini cadastro de Operadores (pedido pelo Henrique em 27/07/2026) —
 * nome, função, telefone, turno preferencial e observações. Sem
 * login/senha (regra de negócio confirmada). Cria, edita e inativa
 * (soft-delete — nunca exclui de verdade, pra preservar o histórico de
 * produção de quem já saiu da empresa).
 */

const TURNOS = [
  { valor: "MANHA", rotulo: "Manhã" },
  { valor: "TARDE", rotulo: "Tarde" },
  { valor: "NOITE", rotulo: "Noite" },
] as const;

const FORM_VAZIO: DadosOperador = { nome: "", funcao: "", telefone: "", observacoes: "", turno: null };

export function OperadoresManager({ operadoresIniciais }: { operadoresIniciais: OperadorProducao[] }) {
  const [operadores, setOperadores] = React.useState(operadoresIniciais);
  const [form, setForm] = React.useState<DadosOperador>(FORM_VAZIO);
  const [editandoId, setEditandoId] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [confirmandoInativarId, setConfirmandoInativarId] = React.useState<string | null>(null);
  const [inativando, setInativando] = React.useState(false);
  const [formAberto, setFormAberto] = React.useState(false);

  function abrirCriacao() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setErro(null);
    setFormAberto(true);
  }

  function abrirEdicao(op: OperadorProducao) {
    setForm({
      nome: op.nome,
      funcao: op.funcao ?? "",
      telefone: op.telefone ?? "",
      observacoes: op.observacoes ?? "",
      turno: op.turno ?? null,
    });
    setEditandoId(op.id);
    setErro(null);
    setFormAberto(true);
  }

  async function handleSalvar() {
    if (!form.nome.trim()) {
      setErro("Informe o nome do operador.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      if (editandoId) {
        const r = await editarOperador(editandoId, form);
        if ("erro" in r) {
          setErro(r.erro);
          return;
        }
        setOperadores((prev) =>
          prev
            .map((o) => (o.id === editandoId ? { ...o, ...form, nome: form.nome.trim() } : o))
            .sort((a, b) => a.nome.localeCompare(b.nome))
        );
      } else {
        const r = await criarOperador(form);
        if ("erro" in r) {
          setErro(r.erro);
          return;
        }
        setOperadores((prev) =>
          [
            ...prev,
            { id: r.id, ...form, nome: form.nome.trim(), ativo: true, createdAt: new Date(), updatedAt: new Date() },
          ].sort((a, b) => a.nome.localeCompare(b.nome))
        );
      }
      setFormAberto(false);
      setForm(FORM_VAZIO);
      setEditandoId(null);
    } finally {
      setSalvando(false);
    }
  }

  async function handleInativar(id: string) {
    setInativando(true);
    try {
      const r = await inativarOperador(id);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setOperadores((prev) => prev.filter((o) => o.id !== id));
      setConfirmandoInativarId(null);
    } finally {
      setInativando(false);
    }
  }

  const rotuloTurno = (t: OperadorProducao["turno"]) => TURNOS.find((x) => x.valor === t)?.rotulo ?? null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        {!formAberto && (
          <Button onClick={abrirCriacao} className="w-fit">
            <Plus className="h-4 w-4" />
            Novo operador
          </Button>
        )}

        {formAberto && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4">
            <p className="text-sm font-semibold text-foreground">
              {editandoId ? "Editar operador" : "Novo operador"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  autoFocus
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Função/cargo</label>
                <input
                  type="text"
                  value={form.funcao ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value }))}
                  placeholder="ex: Montador, Líder de bancada"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                <input
                  type="tel"
                  value={form.telefone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="(34) 99999-9999"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Turno</label>
                <div className="flex gap-2">
                  {TURNOS.map((t) => (
                    <button
                      key={t.valor}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, turno: f.turno === t.valor ? null : t.valor }))}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                        form.turno === t.valor
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-secondary"
                      }`}
                    >
                      {t.rotulo}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Observações</label>
                <textarea
                  value={form.observacoes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={2}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSalvar} disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                {editandoId ? "Salvar alterações" : "Adicionar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormAberto(false);
                  setEditandoId(null);
                  setErro(null);
                }}
                disabled={salvando}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>}

        {operadores.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum operador cadastrado ainda.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border/50">
            {operadores.map((op) => (
              <div key={op.id} className="flex items-center justify-between gap-3 py-3">
                {confirmandoInativarId === op.id ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      Inativar &quot;{op.nome}&quot;? O histórico de produção dele continua guardado.
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleInativar(op.id)}
                        disabled={inativando}
                      >
                        {inativando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, inativar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmandoInativarId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{op.nome}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {op.funcao && (
                          <span className="flex items-center gap-1">
                            <BadgeCheck className="h-3 w-3" />
                            {op.funcao}
                          </span>
                        )}
                        {op.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {op.telefone}
                          </span>
                        )}
                        {op.turno && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {rotuloTurno(op.turno)}
                          </span>
                        )}
                        {op.observacoes && <span className="italic">{op.observacoes}</span>}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => abrirEdicao(op)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmandoInativarId(op.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Inativar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
