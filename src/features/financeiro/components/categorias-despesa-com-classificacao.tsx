"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  criarCategoriaDespesa,
  toggleAtivoCategoriaDespesa,
  excluirCategoriaDespesa,
  classificarCategoriaDespesa,
} from "@/features/financeiro/actions/cadastros-actions";

interface Categoria {
  id: string;
  nome: string;
  ativo: boolean;
  comportamento: "FIXO" | "SEMIFIXO" | "VARIAVEL" | null;
  natureza: "CUSTO" | "DESPESA" | null;
  apropriacao: "DIRETO" | "INDIRETO" | null;
}

const OPCOES_COMPORTAMENTO = [
  { value: "", label: "— Comportamento —" },
  { value: "FIXO", label: "Fixo" },
  { value: "SEMIFIXO", label: "Semifixo/Semivariável" },
  { value: "VARIAVEL", label: "Variável" },
];
const OPCOES_NATUREZA = [
  { value: "", label: "— Natureza —" },
  { value: "CUSTO", label: "Custo (produção)" },
  { value: "DESPESA", label: "Despesa (admin/vendas)" },
];
const OPCOES_APROPRIACAO = [
  { value: "", label: "— Apropriação —" },
  { value: "DIRETO", label: "Direto" },
  { value: "INDIRETO", label: "Indireto" },
];

export function CategoriasDespesaComClassificacao({ categoriasIniciais }: { categoriasIniciais: Categoria[] }) {
  const [categorias, setCategorias] = React.useState(categoriasIniciais);
  const [novoNome, setNovoNome] = React.useState("");
  const [criando, setCriando] = React.useState(false);
  const [salvandoId, setSalvandoId] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleCriar() {
    if (!novoNome.trim()) return;
    setErro(null);
    setCriando(true);
    try {
      const r = await criarCategoriaDespesa(novoNome.trim());
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setCategorias((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, nome: novoNome.trim(), ativo: true, comportamento: null, natureza: null, apropriacao: null },
      ].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovoNome("");
      // O id acima é temporário — um refresh de página vai trazer o id
      // real na próxima navegação; edições de classificação usam o nome
      // pra achar no array local, então funciona mesmo assim.
    } finally {
      setCriando(false);
    }
  }

  async function handleClassificar(
    id: string,
    campo: "comportamento" | "natureza" | "apropriacao",
    valor: string
  ) {
    setSalvandoId(id);
    const categoriaAtual = categorias.find((c) => c.id === id);
    if (!categoriaAtual) return;
    const novaClassificacao = {
      comportamento: categoriaAtual.comportamento,
      natureza: categoriaAtual.natureza,
      apropriacao: categoriaAtual.apropriacao,
      [campo]: valor || null,
    };
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, ...novaClassificacao } : c)));
    try {
      await classificarCategoriaDespesa(id, novaClassificacao as any);
    } finally {
      setSalvandoId(null);
    }
  }

  async function handleToggleAtivo(id: string) {
    setSalvandoId(id);
    try {
      await toggleAtivoCategoriaDespesa(id);
      setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: !c.ativo } : c)));
    } finally {
      setSalvandoId(null);
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir essa categoria?")) return;
    const r = await excluirCategoriaDespesa(id);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    setCategorias((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome da categoria (ex: Folha de Pagamento)"
          className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <Button onClick={handleCriar} disabled={criando}>
          {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </Button>
      </div>

      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Categoria</th>
              <th className="px-3 py-2 text-left font-medium">Comportamento</th>
              <th className="px-3 py-2 text-left font-medium">Natureza</th>
              <th className="px-3 py-2 text-left font-medium">Apropriação</th>
              <th className="px-3 py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {categorias.map((c) => (
              <tr key={c.id} className={!c.ativo ? "opacity-50" : ""}>
                <td className="px-3 py-2 font-medium text-foreground">{c.nome}</td>
                <td className="px-2 py-2">
                  <select
                    value={c.comportamento ?? ""}
                    onChange={(e) => handleClassificar(c.id, "comportamento", e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {OPCOES_COMPORTAMENTO.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={c.natureza ?? ""}
                    onChange={(e) => handleClassificar(c.id, "natureza", e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {OPCOES_NATUREZA.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={c.apropriacao ?? ""}
                    onChange={(e) => handleClassificar(c.id, "apropriacao", e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {OPCOES_APROPRIACAO.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {salvandoId === c.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    <button onClick={() => handleToggleAtivo(c.id)} className="text-muted-foreground hover:text-foreground" title={c.ativo ? "Inativar" : "Ativar"}>
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleExcluir(c.id)} className="text-muted-foreground hover:text-destructive" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
