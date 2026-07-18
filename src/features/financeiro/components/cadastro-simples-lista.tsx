"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Item {
  id: string;
  nome: string;
  ativo: boolean;
}

interface Props {
  itens: Item[];
  placeholder: string;
  onCriar: (nome: string) => Promise<{ erro?: string; ok?: boolean }>;
  onToggleAtivo: (id: string) => Promise<{ erro?: string; ok?: boolean }>;
  onExcluir: (id: string) => Promise<{ erro?: string; ok?: boolean }>;
}

// Componente genérico reaproveitado por Empresas do Grupo e Categorias de
// Despesa — os dois cadastros são estruturalmente idênticos (nome + ativo).
export function CadastroSimplesLista({ itens, placeholder, onCriar, onToggleAtivo, onExcluir }: Props) {
  const router = useRouter();
  const [novoNome, setNovoNome] = React.useState("");
  const [criando, setCriando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [processandoId, setProcessandoId] = React.useState<string | null>(null);

  async function handleCriar() {
    if (!novoNome.trim()) return;
    setErro(null);
    setCriando(true);
    try {
      const r = await onCriar(novoNome.trim());
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setNovoNome("");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCriando(false);
    }
  }

  async function handleToggle(id: string) {
    setProcessandoId(id);
    try {
      const r = await onToggleAtivo(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return;
    setProcessandoId(id);
    try {
      const r = await onExcluir(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-2 pt-5">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button size="sm" onClick={handleCriar} disabled={criando || !novoNome.trim()}>
            {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </CardContent>
      </Card>

      {erro && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {erro}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {itens.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {itens.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className={"text-sm font-medium " + (item.ativo ? "text-foreground" : "text-muted-foreground line-through")}>
                    {item.nome}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(item.id)}
                      disabled={processandoId === item.id}
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase " +
                        (item.ativo ? "bg-success/15 text-success hover:bg-success/25" : "bg-muted text-muted-foreground hover:bg-muted/70")
                      }
                    >
                      {item.ativo ? "Ativo" : "Inativo"}
                    </button>
                    <button
                      onClick={() => handleExcluir(item.id, item.nome)}
                      disabled={processandoId === item.id}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      {processandoId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
