"use client";

import * as React from "react";
import { Loader2, Plus, Pencil, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { criarOperador, editarNomeOperador } from "@/features/producao/actions/producao-actions";
import type { OperadorProducao } from "@/core/producao/entities/producao";

/**
 * Gerenciar Operadores — tela dedicada, separada do fluxo do tablet.
 * Só nome, sem login/senha (regra de negócio confirmada). Só cria e
 * edita nome — NUNCA exclui, pra preservar o histórico de produção de
 * quem já saiu da empresa.
 */
export function OperadoresManager({ operadoresIniciais }: { operadoresIniciais: OperadorProducao[] }) {
  const [operadores, setOperadores] = React.useState(operadoresIniciais);
  const [novoNome, setNovoNome] = React.useState("");
  const [criando, setCriando] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<string | null>(null);
  const [nomeEmEdicao, setNomeEmEdicao] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleCriar() {
    if (!novoNome.trim()) return;
    setErro(null);
    setCriando(true);
    try {
      const r = await criarOperador(novoNome.trim());
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setOperadores((prev) =>
        [...prev, { id: r.id, nome: novoNome.trim(), ativo: true, createdAt: new Date(), updatedAt: new Date() }].sort(
          (a, b) => a.nome.localeCompare(b.nome)
        )
      );
      setNovoNome("");
    } finally {
      setCriando(false);
    }
  }

  function iniciarEdicao(op: OperadorProducao) {
    setEditandoId(op.id);
    setNomeEmEdicao(op.nome);
    setErro(null);
  }

  async function handleSalvarEdicao(id: string) {
    if (!nomeEmEdicao.trim()) return;
    setSalvando(true);
    try {
      const r = await editarNomeOperador(id, nomeEmEdicao.trim());
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setOperadores((prev) =>
        prev.map((o) => (o.id === id ? { ...o, nome: nomeEmEdicao.trim() } : o)).sort((a, b) => a.nome.localeCompare(b.nome))
      );
      setEditandoId(null);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
            placeholder="Nome do novo operador"
            className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          />
          <Button onClick={handleCriar} disabled={criando}>
            {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </div>

        {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>}

        {operadores.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum operador cadastrado ainda.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border/50">
            {operadores.map((op) => (
              <div key={op.id} className="flex items-center justify-between gap-3 py-2.5">
                {editandoId === op.id ? (
                  <>
                    <input
                      type="text"
                      value={nomeEmEdicao}
                      onChange={(e) => setNomeEmEdicao(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSalvarEdicao(op.id)}
                      autoFocus
                      className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => handleSalvarEdicao(op.id)}
                        disabled={salvando}
                        className="rounded-md p-1.5 text-success hover:bg-success/10"
                      >
                        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-foreground">{op.nome}</span>
                    <button
                      onClick={() => iniciarEdicao(op)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
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
