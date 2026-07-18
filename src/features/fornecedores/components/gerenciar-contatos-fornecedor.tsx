"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Phone, Mail, Loader2, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  adicionarContatoFornecedor,
  atualizarContatoFornecedor,
  excluirContatoFornecedor,
} from "@/features/fornecedores/actions/fornecedor-actions";

interface Contato {
  id: string;
  nome: string;
  cargo?: string | null;
  telefone?: string | null;
  email?: string | null;
  principal: boolean;
}

function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2 $3-$4");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return tel;
}

interface FormState {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  principal: boolean;
}

const FORM_VAZIO: FormState = { nome: "", cargo: "", telefone: "", email: "", principal: false };

export function GerenciarContatosFornecedor({
  fornecedorId,
  contatos,
}: {
  fornecedorId: string;
  contatos: Contato[];
}) {
  const router = useRouter();
  const [adicionando, setAdicionando] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  function iniciarEdicao(c: Contato) {
    setEditandoId(c.id);
    setAdicionando(false);
    setForm({
      nome: c.nome,
      cargo: c.cargo ?? "",
      telefone: c.telefone ?? "",
      email: c.email ?? "",
      principal: c.principal,
    });
  }

  function iniciarAdicao() {
    setAdicionando(true);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  }

  function cancelar() {
    setAdicionando(false);
    setEditandoId(null);
    setErro(null);
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro("Informe o nome do contato."); return; }
    setSalvando(true);
    setErro(null);
    const resultado = editandoId
      ? await atualizarContatoFornecedor(fornecedorId, editandoId, form)
      : await adicionarContatoFornecedor(fornecedorId, form);
    setSalvando(false);
    if ("erro" in resultado) { setErro(resultado.erro); return; }
    cancelar();
    router.refresh();
  }

  async function excluir(id: string) {
    if (!confirm("Remover este contato?")) return;
    const resultado = await excluirContatoFornecedor(fornecedorId, id);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  const formularioAberto = adicionando || editandoId !== null;

  return (
    <div className="flex flex-col gap-1">
      {contatos.length === 0 && !formularioAberto && (
        <p className="text-sm text-muted-foreground pb-2">Nenhum contato cadastrado.</p>
      )}

      <div className="flex flex-col divide-y divide-border">
        {contatos.map((c) =>
          editandoId === c.id ? (
            <ContatoForm
              key={c.id}
              form={form}
              setForm={setForm}
              onSalvar={salvar}
              onCancelar={cancelar}
              salvando={salvando}
              erro={erro}
            />
          ) : (
            <div key={c.id} className="group flex flex-col gap-1.5 py-3 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.nome}</span>
                  {c.principal && (
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      Principal
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => iniciarEdicao(c)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => excluir(c.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {c.cargo && <span className="text-xs text-muted-foreground">{c.cargo}</span>}
              {c.telefone && (
                <a href={`tel:${c.telefone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="h-3 w-3 shrink-0" />
                  {formatarTelefone(c.telefone)}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-3 w-3 shrink-0" />
                  {c.email}
                </a>
              )}
            </div>
          )
        )}
      </div>

      {adicionando && (
        <div className="pt-3 border-t border-border">
          <ContatoForm
            form={form}
            setForm={setForm}
            onSalvar={salvar}
            onCancelar={cancelar}
            salvando={salvando}
            erro={erro}
          />
        </div>
      )}

      {!formularioAberto && (
        <Button variant="outline" size="sm" className="mt-3 self-start" onClick={iniciarAdicao}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar contato
        </Button>
      )}
    </div>
  );
}

function ContatoForm({
  form,
  setForm,
  onSalvar,
  onCancelar,
  salvando,
  erro,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSalvar: () => void;
  onCancelar: () => void;
  salvando: boolean;
  erro: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 rounded-lg bg-secondary/30 px-3 -mx-3">
      <input
        autoFocus
        placeholder="Nome"
        value={form.nome}
        onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        placeholder="Cargo (opcional)"
        value={form.cargo}
        onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        placeholder="Telefone (opcional)"
        value={form.telefone}
        onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        placeholder="E-mail (opcional)"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={form.principal}
          onChange={(e) => setForm((f) => ({ ...f, principal: e.target.checked }))}
          className="accent-primary"
        />
        Contato principal
      </label>
      {erro && <span className="text-xs text-destructive">{erro}</span>}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSalvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancelar} disabled={salvando}>
          <X className="h-3.5 w-3.5" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
