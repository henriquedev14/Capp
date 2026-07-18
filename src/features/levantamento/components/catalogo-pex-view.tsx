"use client";

import * as React from "react";
import { Search, Plus, Layers, Wrench } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MaterialPexDialog } from "@/features/levantamento/components/material-pex-dialog";

interface Categoria {
  nome: string;
  total: number;
}

interface MaterialResultado {
  id: string;
  fabricante: string;
  categoria: string;
  nome: string;
  diametro: string | null;
  unidade: string;
}

const ICONE_POR_GRUPO: Record<string, string> = {
  Tubo: "🧵",
  "Conexão - Cotovelo": "📐",
  "Conexão - Te": "🔀",
  "Conexão - Luva": "⭕",
  "Conexão - Conector": "🔗",
  "Conexão - Adaptador": "🔧",
  "Conexão - Tampão": "🔒",
  "Conexão - Distribuidor": "🌐",
  Válvula: "🚰",
  "Componente Kit": "📦",
  "Quadro Hidráulico": "🗂️",
  "Chassi Metálico": "🏗️",
  "Carenagem Plástica": "🛡️",
  Travessa: "➖",
};

export function CatalogoPexView({ categorias }: { categorias: Categoria[] }) {
  const [busca, setBusca] = React.useState("");
  const [resultados, setResultados] = React.useState<MaterialResultado[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [ultimoAdicionado, setUltimoAdicionado] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (busca.length < 2) { setResultados([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/materiais-pex?q=${encodeURIComponent(busca)}`);
        setResultados(await res.json());
      } finally {
        setBuscando(false);
      }
    }, 250);
  }, [busca]);

  return (
    <div className="flex flex-col gap-6">
      {/* Busca rápida + CTA de demonstração */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou diâmetro (ex: cotovelo 20, te redução...)"
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button onClick={() => setDialogAberto(true)}>
              <Plus className="h-4 w-4" />
              Adicionar ao levantamento
            </Button>
          </div>

          {busca.length >= 2 && (
            <div className="rounded-lg border border-border max-h-72 overflow-y-auto">
              {buscando ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Buscando...</p>
              ) : resultados.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum material encontrado.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {resultados.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">{m.categoria}</span>
                        <span className="text-sm font-medium text-foreground">
                          {m.nome}
                          {m.diametro && (
                            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-mono text-primary">
                              {m.diametro}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.fabricante}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de categorias */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Categorias do catálogo</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categorias.map((c) => (
            <Card key={c.nome} className="hover:border-primary/40 transition-colors">
              <CardContent className="flex items-center gap-3 pt-5">
                <span className="text-2xl">{ICONE_POR_GRUPO[c.nome] ?? "🔩"}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{c.nome}</span>
                  <span className="text-xs text-muted-foreground">{c.total} itens</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Nota de origem */}
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3">
        <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Catálogo inicial importado da linha PEX Barbi do Brasil. Outros fabricantes podem ser
          adicionados conforme a necessidade — este repositório alimenta o Levantamento Hidráulico.
        </p>
      </div>

      <MaterialPexDialog
        aberto={dialogAberto}
        onFechar={() => setDialogAberto(false)}
        onConfirmar={(itens) => {
          setUltimoAdicionado(
            `${itens.reduce((acc, i) => acc + i.quantidade, 0)} itens adicionados (demonstração)`
          );
          setTimeout(() => setUltimoAdicionado(null), 4000);
        }}
        titulo="Selecionar materiais PEX"
      />

      {ultimoAdicionado && (
        <div className="fixed bottom-6 right-6 rounded-lg bg-success text-white px-4 py-3 text-sm font-medium shadow-lg">
          ✓ {ultimoAdicionado}
        </div>
      )}
    </div>
  );
}
