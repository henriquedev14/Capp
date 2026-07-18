"use client";

import * as React from "react";
import { Search, Layers, Wrench } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface Fabricante {
  nome: string;
  total: number;
}

interface MaterialResultado {
  id: string;
  fabricante: string;
  categoria: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  kit: "ELETRICO" | "QDC";
}

// Ícone visual por fabricante — os que aparecem no seed inicial (planilha
// QDC Pacaembu). Fabricantes novos caem no fallback, sem quebrar nada.
const ICONE_POR_FABRICANTE: Record<string, string> = {
  Nanoplasticos: "📦",
  Tigre: "🧵",
  Megatrom: "🔌",
  Wago: "🔗",
  Davin: "⚡",
  TAF: "🛠️",
  Frontec: "🏗️",
  "Loja Elétrica": "🏪",
  "B.Lux": "💡",
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function CatalogoEletricoView({ fabricantes }: { fabricantes: Fabricante[] }) {
  const [busca, setBusca] = React.useState("");
  const [resultados, setResultados] = React.useState<MaterialResultado[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (busca.length < 2) { setResultados([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/materiais-catalogo?q=${encodeURIComponent(busca)}`);
        setResultados(await res.json());
      } finally {
        setBuscando(false);
      }
    }, 250);
  }, [busca]);

  return (
    <div className="flex flex-col gap-6">
      {/* Busca livre no catálogo */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, fabricante ou categoria (ex: caixa 4x2, wago, disjuntor...)"
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
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
                    <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/40">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-muted-foreground truncate">{m.categoria}</span>
                        <span className="text-sm font-medium text-foreground truncate">{m.descricao}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-muted-foreground">{m.fabricante}</span>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                          {m.kit}
                        </span>
                        <span className="text-sm font-medium tabular-nums text-foreground">
                          {formatBRL(m.precoUnitario)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de fabricantes */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Fabricantes no catálogo</h2>
        </div>
        {fabricantes.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-sm text-muted-foreground">
                Nenhum material cadastrado. Rode o seed pra carregar o catálogo inicial.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {fabricantes.map((f) => (
              <Card key={f.nome} className="hover:border-primary/40 transition-colors">
                <CardContent className="flex items-center gap-3 pt-5">
                  <span className="text-2xl">{ICONE_POR_FABRICANTE[f.nome] ?? "🔩"}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{f.nome}</span>
                    <span className="text-xs text-muted-foreground">{f.total} itens</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Nota de origem */}
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3">
        <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Catálogo inicial semeado a partir da planilha QDC Pacaembu (proposta real HGI). Preços
          são de referência e podem ser ajustados depois. Alimenta o Levantamento de Materiais
          e o Bloco 2 do Orçamento.
        </p>
      </div>
    </div>
  );
}
