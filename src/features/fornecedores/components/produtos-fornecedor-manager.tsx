"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Loader2, X, PencilLine, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  adicionarProdutoFornecedor,
  atualizarPrecoProduto,
  removerProdutoFornecedor,
  toggleAtivoProduto,
  criarMaterialECadastrarNoFornecedor,
} from "@/features/fornecedores/actions/produto-fornecedor-actions";

interface ProdutoCarregado {
  id: string;
  precoUnitario: number;
  ativo: boolean;
  material: {
    id: string;
    fabricante: string;
    categoria: string;
    nome: string;
    especificacao: string | null;
    unidade: string;
    precoUnitario: number;
    kit: string;
  };
}

interface MaterialCatalogoResultado {
  id: string;
  fabricante: string;
  categoria: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  kit: string;
}

interface Props {
  fornecedorId: string;
  produtos: ProdutoCarregado[];
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Campo de texto compacto usado no formulário de "criar material novo".
function CampoNovo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

export function ProdutosFornecedorManager({ fornecedorId, produtos }: Props) {
  const router = useRouter();

  // ---- Busca no catálogo (adicionar produto) ----
  const [busca, setBusca] = React.useState("");
  const [resultados, setResultados] = React.useState<MaterialCatalogoResultado[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const [adicionandoId, setAdicionandoId] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // IDs de materiais que já estão na lista deste fornecedor — pra ocultar
  // do resultado da busca (não faz sentido oferecer duplicata).
  const idsJaExistentes = React.useMemo(
    () => new Set(produtos.map((p) => p.material.id)),
    [produtos]
  );

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (busca.length < 2) {
      setResultados([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/materiais-catalogo?q=${encodeURIComponent(busca)}`);
        const data: MaterialCatalogoResultado[] = await res.json();
        setResultados(data);
      } finally {
        setBuscando(false);
      }
    }, 250);
  }, [busca]);

  async function handleAdicionar(materialId: string) {
    setAdicionandoId(materialId);
    const r = await adicionarProdutoFornecedor(fornecedorId, materialId);
    setAdicionandoId(null);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    setBusca("");
    setResultados([]);
    router.refresh();
  }

  // ---- Criar material novo (não achou no catálogo) ----
  const [mostrarFormNovo, setMostrarFormNovo] = React.useState(false);
  const [criando, setCriando] = React.useState(false);
  const [erroNovo, setErroNovo] = React.useState<string | null>(null);
  const [novoMaterial, setNovoMaterial] = React.useState({
    fabricante: "",
    categoria: "",
    nome: "",
    especificacao: "",
    unidade: "un",
    kit: "ELETRICO" as "ELETRICO" | "QDC",
    precoUnitario: "",
  });

  function abrirFormNovo() {
    // Pré-preenche o nome com o que já foi digitado na busca — poupa
    // trabalho já que provavelmente é o mesmo material que não foi achado.
    setNovoMaterial((prev) => ({ ...prev, nome: busca }));
    setErroNovo(null);
    setMostrarFormNovo(true);
  }

  async function handleCriarNovo() {
    setErroNovo(null);
    const preco = Number(novoMaterial.precoUnitario.replace(",", "."));
    if (!Number.isFinite(preco) || preco < 0) {
      setErroNovo("Preço inválido.");
      return;
    }
    setCriando(true);
    const r = await criarMaterialECadastrarNoFornecedor(fornecedorId, {
      fabricante: novoMaterial.fabricante,
      categoria: novoMaterial.categoria,
      nome: novoMaterial.nome,
      especificacao: novoMaterial.especificacao || undefined,
      unidade: novoMaterial.unidade,
      kit: novoMaterial.kit,
      precoUnitario: preco,
    });
    setCriando(false);
    if (r.erro) {
      setErroNovo(r.erro);
      return;
    }
    setMostrarFormNovo(false);
    setBusca("");
    setResultados([]);
    setNovoMaterial({
      fabricante: "",
      categoria: "",
      nome: "",
      especificacao: "",
      unidade: "un",
      kit: "ELETRICO",
      precoUnitario: "",
    });
    router.refresh();
  }

  async function handleRemover(produtoId: string, nome: string) {
    if (!confirm(`Remover "${nome}" da lista deste fornecedor?`)) return;
    const r = await removerProdutoFornecedor(produtoId);
    if (r.erro) alert(r.erro);
    else router.refresh();
  }

  async function handleToggleAtivo(produtoId: string) {
    const r = await toggleAtivoProduto(produtoId);
    if (r.erro) alert(r.erro);
    else router.refresh();
  }

  // ---- Agrupar produtos por fabricante pra visualização ----
  const agrupados = React.useMemo(() => {
    const map = new Map<string, ProdutoCarregado[]>();
    produtos.forEach((p) => {
      const key = p.material.fabricante;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [produtos]);

  return (
    <div className="flex flex-col gap-5">
      {/* Busca para adicionar do catálogo */}
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Adicionar produto do catálogo</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar material (ex: caixa 4x2, cabo 2.5mm, disjuntor...)"
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {busca.length >= 2 && (
          <div className="mt-3 max-h-[26rem] overflow-y-auto rounded-lg border border-border">
            {buscando ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Buscando...</p>
            ) : resultados.length === 0 && !mostrarFormNovo ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum material encontrado no catálogo.
                </p>
                <Button size="sm" variant="outline" onClick={abrirFormNovo}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Criar material novo
                </Button>
              </div>
            ) : mostrarFormNovo ? (
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Cadastrar material novo
                  </span>
                  <button
                    onClick={() => setMostrarFormNovo(false)}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <CampoNovo
                    label="Fabricante"
                    value={novoMaterial.fabricante}
                    onChange={(v) => setNovoMaterial((p) => ({ ...p, fabricante: v }))}
                    placeholder="Wago, Tigre..."
                  />
                  <CampoNovo
                    label="Categoria"
                    value={novoMaterial.categoria}
                    onChange={(v) => setNovoMaterial((p) => ({ ...p, categoria: v }))}
                    placeholder="Caixa, Conector..."
                  />
                </div>

                <CampoNovo
                  label="Nome"
                  value={novoMaterial.nome}
                  onChange={(v) => setNovoMaterial((p) => ({ ...p, nome: v }))}
                  placeholder="Caixa Teto 6 Posições"
                />

                <CampoNovo
                  label="Especificação (opcional)"
                  value={novoMaterial.especificacao}
                  onChange={(v) => setNovoMaterial((p) => ({ ...p, especificacao: v }))}
                  placeholder="24 posições, 1x20A..."
                />

                <div className="grid grid-cols-3 gap-2.5">
                  <CampoNovo
                    label="Unidade"
                    value={novoMaterial.unidade}
                    onChange={(v) => setNovoMaterial((p) => ({ ...p, unidade: v }))}
                    placeholder="un"
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Kit</label>
                    <select
                      value={novoMaterial.kit}
                      onChange={(e) =>
                        setNovoMaterial((p) => ({
                          ...p,
                          kit: e.target.value as "ELETRICO" | "QDC",
                        }))
                      }
                      className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="ELETRICO">Elétrico</option>
                      <option value="QDC">QDC</option>
                    </select>
                  </div>
                  <CampoNovo
                    label="Preço (R$)"
                    value={novoMaterial.precoUnitario}
                    onChange={(v) => setNovoMaterial((p) => ({ ...p, precoUnitario: v }))}
                    placeholder="0,00"
                  />
                </div>

                {erroNovo && (
                  <p className="text-xs text-destructive">{erroNovo}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMostrarFormNovo(false)}
                    disabled={criando}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleCriarNovo} disabled={criando}>
                    {criando ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Criar e adicionar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {resultados.map((m) => {
                  const jaAdicionado = idsJaExistentes.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-secondary/40"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {m.descricao}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {m.fabricante} — {m.categoria} · ref. {formatBRL(m.precoUnitario)}
                        </span>
                      </div>
                      {jaAdicionado ? (
                        <span className="shrink-0 rounded bg-secondary px-2 py-1 text-[10px] font-medium uppercase text-muted-foreground">
                          Já na lista
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={adicionandoId === m.id}
                          onClick={() => handleAdicionar(m.id)}
                        >
                          {adicionandoId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Adicionar
                        </Button>
                      )}
                    </div>
                  );
                })}
                {/* Mesmo achando resultados, sempre oferece a opção de
                    cadastrar algo novo — o que a busca achou pode não ser
                    exatamente o que precisa. */}
                <div className="flex justify-center p-2">
                  <Button size="sm" variant="ghost" onClick={abrirFormNovo}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Não achou? Criar material novo
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de produtos cadastrados, agrupada por fabricante */}
      {produtos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Este fornecedor ainda não tem produtos cadastrados.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Use a busca acima pra selecionar itens do catálogo elétrico e definir os preços.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {agrupados.map(([fabricante, itens]) => (
            <div key={fabricante} className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  {fabricante}
                </span>
                <span className="text-xs text-muted-foreground">
                  {itens.length} {itens.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-2 text-left font-medium">Descrição</th>
                    <th className="px-2 py-2 text-center font-medium w-16">Und</th>
                    <th className="px-2 py-2 text-right font-medium w-28">Ref.</th>
                    <th className="px-2 py-2 text-right font-medium w-32">Preço</th>
                    <th className="px-2 py-2 text-center font-medium w-24">Status</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {itens.map((p) => (
                    <LinhaProduto
                      key={p.id}
                      produto={p}
                      onToggleAtivo={handleToggleAtivo}
                      onRemover={(nome) => handleRemover(p.id, nome)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Linha da tabela como componente separado — carrega o estado local de
// edição de preço sem re-renderizar a lista inteira.
function LinhaProduto({
  produto,
  onToggleAtivo,
  onRemover,
}: {
  produto: ProdutoCarregado;
  onToggleAtivo: (id: string) => void;
  onRemover: (nome: string) => void;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [valorInput, setValorInput] = React.useState(String(produto.precoUnitario));
  const [salvando, setSalvando] = React.useState(false);

  async function salvar() {
    const novo = Number(valorInput.replace(",", "."));
    if (!Number.isFinite(novo) || novo < 0) {
      alert("Preço inválido.");
      return;
    }
    if (novo === produto.precoUnitario) {
      setEditando(false);
      return;
    }
    setSalvando(true);
    const r = await atualizarPrecoProduto(produto.id, novo);
    setSalvando(false);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  const nomeCompleto = [produto.material.nome, produto.material.especificacao]
    .filter(Boolean)
    .join(" — ");

  const semPreco = produto.precoUnitario === 0;

  return (
    <tr className={produto.ativo ? "" : "opacity-50"}>
      <td className="px-4 py-2">
        <div className="flex flex-col">
          <span className="text-foreground">{nomeCompleto}</span>
          <span className="text-xs text-muted-foreground">{produto.material.categoria}</span>
        </div>
      </td>
      <td className="px-2 py-2 text-center text-xs text-muted-foreground uppercase">
        {produto.material.unidade}
      </td>
      <td className="px-2 py-2 text-right text-xs text-muted-foreground tabular-nums">
        {formatBRL(produto.material.precoUnitario)}
      </td>
      <td className="px-2 py-2 text-right">
        {editando ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={valorInput}
              onChange={(e) => setValorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") salvar();
                if (e.key === "Escape") {
                  setValorInput(String(produto.precoUnitario));
                  setEditando(false);
                }
              }}
              autoFocus
              className="w-24 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={salvar}
              disabled={salvando}
              className="rounded p-1 text-success hover:bg-success/10"
              aria-label="Salvar"
            >
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditando(true)}
            className={
              "group flex w-full items-center justify-end gap-1.5 tabular-nums hover:text-primary " +
              (semPreco ? "text-warning font-medium" : "text-foreground font-medium")
            }
            title={semPreco ? "Preço zerado — bloqueia geração de cotação" : "Clique pra editar"}
          >
            {formatBRL(produto.precoUnitario)}
            <PencilLine className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </td>
      <td className="px-2 py-2 text-center">
        <button
          onClick={() => onToggleAtivo(produto.id)}
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase " +
            (produto.ativo
              ? "bg-success/10 text-success hover:bg-success/20"
              : "bg-muted text-muted-foreground hover:bg-muted/70")
          }
        >
          {produto.ativo ? "Ativo" : "Inativo"}
        </button>
      </td>
      <td className="px-2 py-2 text-center">
        <button
          onClick={() => onRemover(nomeCompleto)}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
