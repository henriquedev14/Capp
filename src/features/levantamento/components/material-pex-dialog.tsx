"use client";

import * as React from "react";
import { Search, Plus, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaterialPex {
  id: string;
  fabricante: string;
  categoria: string;
  nome: string;
  diametro: string | null;
  unidade: string;
}

interface ItemSelecionado {
  material: MaterialPex;
  quantidade: number;
}

interface MaterialPexDialogProps {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: (itens: ItemSelecionado[]) => void;
  titulo?: string;
}

export function MaterialPexDialog({
  aberto,
  onFechar,
  onConfirmar,
  titulo = "Adicionar materiais PEX",
}: MaterialPexDialogProps) {
  const [busca, setBusca] = React.useState("");
  const [fabricante, setFabricante] = React.useState("");
  const [fabricantes, setFabricantes] = React.useState<string[]>([]);
  const [resultados, setResultados] = React.useState<MaterialPex[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const [selecionados, setSelecionados] = React.useState<ItemSelecionado[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ao abrir: reseta estado, foca a busca, carrega lista inicial (sem
  // precisar digitar nada) e a lista de fabricantes para o filtro.
  React.useEffect(() => {
    if (!aberto) return;
    setTimeout(() => inputRef.current?.focus(), 100);
    setBusca("");
    setFabricante("");
    setSelecionados([]);
    buscarMateriais("", "");
    fetch("/api/materiais-pex/fabricantes")
      .then((r) => r.json())
      .then((data: string[]) => setFabricantes(data))
      .catch(() => setFabricantes([]));
  }, [aberto]);

  async function buscarMateriais(q: string, fab: string) {
    setBuscando(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (fab) params.set("fabricante", fab);
      const res = await fetch(`/api/materiais-pex?${params.toString()}`);
      const data = await res.json() as MaterialPex[];
      setResultados(data);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }

  // Busca com debounce ao digitar ou trocar o filtro de fabricante
  React.useEffect(() => {
    if (!aberto) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarMateriais(busca, fabricante), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, fabricante]);

  function adicionarMaterial(material: MaterialPex) {
    setSelecionados((prev) => {
      const existente = prev.find((s) => s.material.id === material.id);
      if (existente) {
        return prev.map((s) =>
          s.material.id === material.id ? { ...s, quantidade: s.quantidade + 1 } : s
        );
      }
      return [...prev, { material, quantidade: 1 }];
    });
  }

  function atualizarQuantidade(id: string, quantidade: number) {
    if (quantidade <= 0) {
      removerItem(id);
      return;
    }
    setSelecionados((prev) =>
      prev.map((s) => (s.material.id === id ? { ...s, quantidade } : s))
    );
  }

  function removerItem(id: string) {
    setSelecionados((prev) => prev.filter((s) => s.material.id !== id));
  }

  function confirmar() {
    if (selecionados.length > 0) onConfirmar(selecionados);
    onFechar();
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />

      {/* Dialog */}
      <div className="relative z-10 flex flex-col w-full max-w-2xl max-h-[80vh] rounded-xl border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
          </div>
          <button onClick={onFechar} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Busca + filtro de fabricante */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome ou diâmetro (ex: cotovelo 16, te 20...)"
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={fabricante}
            onChange={(e) => setFabricante(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos fornecedores</option>
            {fabricantes.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Conteúdo */}
        <div className="flex flex-1 overflow-hidden">
          {/* Resultados — sempre com listagem rolável, nunca em branco */}
          <div className="flex-1 overflow-y-auto border-r border-border">
            {buscando ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Buscando...</div>
            ) : resultados.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {busca ? `Nenhum material encontrado para "${busca}"` : "Nenhum material cadastrado."}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {resultados.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => adicionarMaterial(m)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-muted-foreground">{m.categoria}</span>
                      <span className="text-sm font-medium text-foreground">
                        {m.nome}
                        {m.diametro && (
                          <span className="ml-2 text-xs font-mono text-primary">{m.diametro}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground/60">{m.fabricante}</span>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-primary ml-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Itens selecionados */}
          <div className="w-64 flex flex-col">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selecionados ({selecionados.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selecionados.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Clique nos materiais para adicionar
                </p>
              ) : (
                <div className="divide-y divide-border/50 p-2">
                  {selecionados.map((item) => (
                    <div key={item.material.id} className="flex items-center gap-2 py-2">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.material.nome}
                        </span>
                        {item.material.diametro && (
                          <span className="text-[10px] font-mono text-primary">
                            {item.material.diametro}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => atualizarQuantidade(item.material.id, item.quantidade - 1)}
                          className="h-5 w-5 rounded text-center text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) => atualizarQuantidade(item.material.id, parseInt(e.target.value) || 1)}
                          className="w-10 rounded border border-input bg-background px-1 py-0.5 text-center text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => atualizarQuantidade(item.material.id, item.quantidade + 1)}
                          className="h-5 w-5 rounded text-center text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removerItem(item.material.id)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <span className="text-sm text-muted-foreground">
            {selecionados.length === 0
              ? "Nenhum item selecionado"
              : `${selecionados.reduce((acc, s) => acc + s.quantidade, 0)} itens`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onFechar}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmar} disabled={selecionados.length === 0}>
              Adicionar ao levantamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
