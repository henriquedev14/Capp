"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, X, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  criarContaFixaModelo,
  editarContaFixaModelo,
  toggleAtivoContaFixaModelo,
  excluirContaFixaModelo,
} from "@/features/financeiro/actions/conta-fixa-actions";

interface OpcaoSimples {
  id: string;
  nome: string;
}

interface ContaFixa {
  id: string;
  descricao: string;
  valor: number;
  diaUtilVencimento: number;
  ativo: boolean;
  empresaId: string;
  empresaNome: string;
  categoriaId: string;
  categoriaNome: string;
  observacoes: string | null;
}

interface Props {
  empresas: OpcaoSimples[];
  categorias: OpcaoSimples[];
  contasFixas: ContaFixa[];
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ContasFixasManager({ empresas, categorias, contasFixas }: Props) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [processandoId, setProcessandoId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    empresaId: empresas[0]?.id ?? "",
    categoriaId: categorias[0]?.id ?? "",
    descricao: "",
    valor: "",
    diaUtilVencimento: "5",
    observacoes: "",
  });

  async function handleCriar() {
    setErro(null);
    const valor = Number(form.valor.replace(",", "."));
    const dia = parseInt(form.diaUtilVencimento, 10);
    if (!form.empresaId || !form.categoriaId) {
      setErro("Selecione empresa e categoria.");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        empresaId: form.empresaId,
        categoriaId: form.categoriaId,
        descricao: form.descricao,
        valor,
        diaUtilVencimento: dia,
        observacoes: form.observacoes,
      };
      const r = editandoId
        ? await editarContaFixaModelo(editandoId, dados)
        : await criarContaFixaModelo(dados);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      fecharForm();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  function fecharForm() {
    setMostrarForm(false);
    setEditandoId(null);
    setForm({ ...form, descricao: "", valor: "", observacoes: "" });
  }

  function abrirEdicao(c: ContaFixa) {
    setForm({
      empresaId: c.empresaId,
      categoriaId: c.categoriaId,
      descricao: c.descricao,
      valor: String(c.valor),
      diaUtilVencimento: String(c.diaUtilVencimento),
      observacoes: c.observacoes ?? "",
    });
    setEditandoId(c.id);
    setMostrarForm(true);
  }

  async function handleToggle(id: string) {
    setProcessandoId(id);
    try {
      const r = await toggleAtivoContaFixaModelo(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleExcluir(id: string, descricao: string) {
    if (!confirm(`Excluir a conta fixa "${descricao}"? Lançamentos já gerados não são afetados.`)) return;
    setProcessandoId(id);
    try {
      const r = await excluirContaFixaModelo(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessandoId(null);
    }
  }

  const semCadastroBase = empresas.length === 0 || categorias.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {semCadastroBase && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
          Cadastre pelo menos uma Empresa do Grupo e uma Categoria de Despesa antes de criar contas fixas.
        </div>
      )}

      {!mostrarForm ? (
        <Button size="sm" onClick={() => setMostrarForm(true)} disabled={semCadastroBase} className="w-fit">
          <Plus className="h-4 w-4" />
          Nova conta fixa
        </Button>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {editandoId ? "Editar conta fixa" : "Nova conta fixa recorrente"}
              </span>
              <button onClick={fecharForm} className="rounded p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                <select
                  value={form.empresaId}
                  onChange={(e) => setForm((f) => ({ ...f, empresaId: e.target.value }))}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <select
                  value={form.categoriaId}
                  onChange={(e) => setForm((f) => ({ ...f, categoriaId: e.target.value }))}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              <input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Aluguel"
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
                <input
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Dia útil de vencimento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.diaUtilVencimento}
                  onChange={(e) => setForm((f) => ({ ...f, diaUtilVencimento: e.target.value }))}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            {erro && <p className="text-xs text-destructive">{erro}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={fecharForm} disabled={salvando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCriar} disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editandoId ? "Salvar alterações" : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {contasFixas.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma conta fixa cadastrada ainda.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {contasFixas.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className={"text-sm font-medium " + (c.ativo ? "text-foreground" : "text-muted-foreground line-through")}>
                      {c.descricao}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.empresaNome} · {c.categoriaNome} · {c.diaUtilVencimento}º dia útil
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(c.valor)}</span>
                    <button
                      onClick={() => handleToggle(c.id)}
                      disabled={processandoId === c.id}
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase " +
                        (c.ativo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")
                      }
                    >
                      {c.ativo ? "Ativa" : "Inativa"}
                    </button>
                    <button
                      onClick={() => abrirEdicao(c)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleExcluir(c.id, c.descricao)}
                      disabled={processandoId === c.id}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      {processandoId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
