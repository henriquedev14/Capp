"use client";

import * as React from "react";
import { Search, Plus, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaterialCatalogo {
  id: string;
  fabricante: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  kit: string;
  avulso?: boolean; // true = não veio do catálogo, é item digitado na hora
}

interface ItemSelecionado {
  material: MaterialCatalogo;
  quantidade: number;
}

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: (itens: ItemSelecionado[]) => void;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function MaterialCatalogoDialog({ aberto, onFechar, onConfirmar }: Props) {
  const [busca, setBusca] = React.useState("");
  const [fabricante, setFabricante] = React.useState("");
  const [fabricantes, setFabricantes] = React.useState<string[]>([]);
  const [resultados, setResultados] = React.useState<MaterialCatalogo[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const [selecionados, setSelecionados] = React.useState<ItemSelecionado[]>([]);
  const [avulsoAberto, setAvulsoAberto] = React.useState(false);
  const [avulsoFabricante, setAvulsoFabricante] = React.useState("");
  const [avulsoDescricao, setAvulsoDescricao] = React.useState("");
  const [avulsoUnidade, setAvulsoUnidade] = React.useState("UN");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!aberto) return;
    setTimeout(() => inputRef.current?.focus(), 100);
    setBusca("");
    setFabricante("");
    setSelecionados([]);
    buscar("", "");
    fetch("/api/materiais-catalogo/fabricantes")
      .then((r) => r.json())
      .then((data: string[]) => setFabricantes(data))
      .catch(() => setFabricantes([]));
  }, [aberto]);

  async function buscar(q: string, fab: string) {
    setBuscando(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (fab) params.set("fabricante", fab);
      const res = await fetch(`/api/materiais-catalogo?${params.toString()}`);
      setResultados(await res.json());
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }

  React.useEffect(() => {
    if (!aberto) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(busca, fabricante), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, fabricante]);

  if (!aberto) return null;

  function adicionar(material: MaterialCatalogo) {
    setSelecionados((prev) => {
      const existe = prev.find((s) => s.material.id === material.id);
      if (existe) {
        return prev.map((s) => s.material.id === material.id ? { ...s, quantidade: s.quantidade + 1 } : s);
      }
      return [...prev, { material, quantidade: 1 }];
    });
  }

  function atualizarQtd(id: string, quantidade: number) {
    if (quantidade <= 0) { setSelecionados((p) => p.filter((s) => s.material.id !== id)); return; }
    setSelecionados((p) => p.map((s) => s.material.id === id ? { ...s, quantidade } : s));
  }

  function adicionarAvulso() {
    if (!avulsoDescricao.trim()) return;
    const item: MaterialCatalogo = {
      id: `avulso-${Date.now()}`,
      fabricante: avulsoFabricante.trim() || "A definir",
      descricao: avulsoDescricao.trim(),
      unidade: avulsoUnidade.trim() || "UN",
      precoUnitario: 0, // sem catálogo ainda — preço entra depois, na cotação
      kit: "ELETRICO",
      avulso: true,
    };
    setSelecionados((prev) => [...prev, { material: item, quantidade: 1 }]);
    setAvulsoDescricao("");
    setAvulsoFabricante("");
    setAvulsoAberto(false);
  }

  function confirmar() {
    if (selecionados.length > 0) onConfirmar(selecionados);
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className="relative z-10 flex flex-col w-full max-w-2xl max-h-[80vh] rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Adicionar materiais</h2>
          </div>
          <button onClick={onFechar} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por descrição ou fabricante..."
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={fabricante}
            onChange={(e) => setFabricante(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos fabricantes</option>
            {fabricantes.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto border-r border-border">
            {buscando ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Buscando...</div>
            ) : resultados.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum material encontrado.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {resultados.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => adicionar(m)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-muted-foreground">{m.fabricante}</span>
                      <span className="text-sm font-medium text-foreground">{m.descricao}</span>
                      <span className="text-xs font-mono text-primary">{formatBRL(m.precoUnitario)} / {m.unidade}</span>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-primary ml-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Não achou no catálogo? Deixa incluir na mesma hora — o preço
                fica pendente até a cotação (não precisa esperar cadastrar
                fornecedor pra fazer o levantamento). */}
            <div className="border-t border-border p-3">
              {avulsoAberto ? (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                  <span className="text-xs font-medium text-foreground">Adicionar material avulso</span>
                  <input
                    value={avulsoDescricao}
                    onChange={(e) => setAvulsoDescricao(e.target.value)}
                    placeholder="Descrição do material *"
                    autoFocus
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={avulsoFabricante}
                      onChange={(e) => setAvulsoFabricante(e.target.value)}
                      placeholder="Fabricante (opcional)"
                      className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                    />
                    <input
                      value={avulsoUnidade}
                      onChange={(e) => setAvulsoUnidade(e.target.value)}
                      placeholder="Unidade (ex: UN, M, KG)"
                      className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAvulsoAberto(false)}>Cancelar</Button>
                    <Button size="sm" onClick={adicionarAvulso} disabled={!avulsoDescricao.trim()}>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAvulsoAberto(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Não achou? Adicionar material avulso
                </button>
              )}
            </div>
          </div>

          <div className="w-72 flex flex-col">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selecionados ({selecionados.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selecionados.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">Clique nos materiais pra adicionar</p>
              ) : (
                <div className="divide-y divide-border/50 p-2">
                  {selecionados.map((item) => (
                    <div key={item.material.id} className="flex items-center gap-2 py-2">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground truncate">{item.material.descricao}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.material.avulso ? "Preço a definir na cotação" : formatBRL(item.material.precoUnitario * item.quantidade)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => atualizarQtd(item.material.id, item.quantidade - 1)} className="h-5 w-5 rounded text-xs font-bold text-muted-foreground hover:bg-secondary">−</button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) => atualizarQtd(item.material.id, parseInt(e.target.value) || 1)}
                          className="w-10 rounded border border-input bg-background px-1 py-0.5 text-center text-xs font-mono"
                        />
                        <button onClick={() => atualizarQtd(item.material.id, item.quantidade + 1)} className="h-5 w-5 rounded text-xs font-bold text-muted-foreground hover:bg-secondary">+</button>
                        <button onClick={() => atualizarQtd(item.material.id, 0)} className="ml-1 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <span className="text-sm text-muted-foreground">
            {selecionados.length === 0 ? "Nenhum item" : formatBRL(selecionados.reduce((acc, s) => acc + s.material.precoUnitario * s.quantidade, 0))}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onFechar}>Cancelar</Button>
            <Button size="sm" onClick={confirmar} disabled={selecionados.length === 0}>Adicionar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
