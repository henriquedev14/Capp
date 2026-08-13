"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { criarEmpreendimentoLegado, type KitLegadoInput } from "@/features/empreendimentos/actions/legado-actions";

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };
const KITS_DISPONIVEIS = ["ELETRICO", "HIDRAULICO", "QDC"] as const;
const TIPOS = [
  { value: "RESIDENCIAL_VERTICAL", label: "Residencial Vertical" },
  { value: "RESIDENCIAL_HORIZONTAL", label: "Residencial Horizontal" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "INFRAESTRUTURA", label: "Infraestrutura" },
  { value: "LOTEAMENTO", label: "Loteamento" },
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface LinhaKit {
  kit: "ELETRICO" | "HIDRAULICO" | "QDC";
  quantidadeTotal: string;
  quantidadeEntregue: string;
  valorContrato: string;
  valorFaturado: string;
}

/**
 * Cadastro simplificado de empreendimento Legado — usado quando não
 * tem nada além do básico: sem torres, sem tipologias detalhadas, sem
 * planilha de material, sem levantamento. Cria tudo numa ação só.
 * Pedido pelo Henrique em 13/08/2026.
 */
export function CadastroLegadoForm({ clientesAtivos }: { clientesAtivos: Array<{ value: string; label: string }> }) {
  const router = useRouter();
  const [nome, setNome] = React.useState("");
  const [clienteId, setClienteId] = React.useState("");
  const [cidade, setCidade] = React.useState("");
  const [estado, setEstado] = React.useState("");
  const [endereco, setEndereco] = React.useState("");
  const [tipo, setTipo] = React.useState("RESIDENCIAL_VERTICAL");
  const [construtora, setConstrutora] = React.useState("");
  const [responsavelComercial, setResponsavelComercial] = React.useState("");
  const [linhas, setLinhas] = React.useState<LinhaKit[]>([
    { kit: "ELETRICO", quantidadeTotal: "", quantidadeEntregue: "", valorContrato: "", valorFaturado: "" },
  ]);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  function parseNum(v: string): number {
    const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function atualizarLinha(i: number, campo: keyof LinhaKit, valor: string) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  function adicionarLinha() {
    const usados = linhas.map((l) => l.kit);
    const proximo = KITS_DISPONIVEIS.find((k) => !usados.includes(k));
    if (!proximo) return;
    setLinhas((prev) => [...prev, { kit: proximo, quantidadeTotal: "", quantidadeEntregue: "", valorContrato: "", valorFaturado: "" }]);
  }

  function removerLinha(i: number) {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleCriar() {
    setErro(null);
    if (!nome.trim()) return setErro("Preencha o nome do empreendimento.");
    if (!clienteId) return setErro("Escolha a construtora.");

    const kits: KitLegadoInput[] = linhas.map((l) => ({
      kit: l.kit,
      quantidadeTotal: parseNum(l.quantidadeTotal),
      quantidadeEntregue: parseNum(l.quantidadeEntregue),
      valorContrato: parseNum(l.valorContrato),
      valorFaturado: parseNum(l.valorFaturado),
    }));

    setSalvando(true);
    try {
      const r = await criarEmpreendimentoLegado({
        nome,
        clienteId,
        cidade,
        estado,
        endereco,
        tipo,
        construtora,
        responsavelComercial,
        kits,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      router.push(`/empreendimentos/${r.id}`);
    } finally {
      setSalvando(false);
    }
  }

  const inputCls = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm";
  const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-sm font-semibold text-foreground">Dados básicos</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome do empreendimento</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Construtora (cliente)</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inputCls}>
              <option value="">Selecione...</option>
              {clientesAtivos.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Endereço</label>
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Cidade</label>
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>UF</label>
              <input value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Construtora executora (opcional)</label>
            <input value={construtora} onChange={(e) => setConstrutora(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Responsável comercial (opcional)</label>
            <input value={responsavelComercial} onChange={(e) => setResponsavelComercial(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-warning/40 bg-card p-5">
        <p className="mb-1 text-sm font-semibold text-foreground">Kits contratados</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Sem torres, sem tipologias, sem planilha — só os números que você já tem.
        </p>

        {linhas.map((linha, i) => (
          <div key={i} className="mb-3 rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <select
                value={linha.kit}
                onChange={(e) => atualizarLinha(i, "kit", e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
              >
                {KITS_DISPONIVEIS.map((k) => (
                  <option key={k} value={k}>
                    {LABEL_KIT[k]}
                  </option>
                ))}
              </select>
              {linhas.length > 1 && (
                <button onClick={() => removerLinha(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="text-[11px] text-muted-foreground">Qtd. total</label>
                <input value={linha.quantidadeTotal} onChange={(e) => atualizarLinha(i, "quantidadeTotal", e.target.value)} inputMode="numeric" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Já entregues</label>
                <input value={linha.quantidadeEntregue} onChange={(e) => atualizarLinha(i, "quantidadeEntregue", e.target.value)} inputMode="numeric" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Contrato (R$)</label>
                <input value={linha.valorContrato} onChange={(e) => atualizarLinha(i, "valorContrato", e.target.value)} inputMode="decimal" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Já faturado (R$)</label>
                <input value={linha.valorFaturado} onChange={(e) => atualizarLinha(i, "valorFaturado", e.target.value)} inputMode="decimal" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" />
              </div>
            </div>
            {parseNum(linha.quantidadeTotal) > 0 && parseNum(linha.valorContrato) > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Valor por kit: {formatBRL(parseNum(linha.valorContrato) / parseNum(linha.quantidadeTotal))} · Faltam
                produzir: {parseNum(linha.quantidadeTotal) - parseNum(linha.quantidadeEntregue)} · Falta faturar:{" "}
                {formatBRL(parseNum(linha.valorContrato) - parseNum(linha.valorFaturado))}
              </p>
            )}
          </div>
        ))}

        {linhas.length < KITS_DISPONIVEIS.length && (
          <button onClick={adicionarLinha} className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" />
            Adicionar outro kit
          </button>
        )}
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <button
        onClick={handleCriar}
        disabled={salvando}
        className="flex w-fit items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        Criar empreendimento Legado
      </button>
    </div>
  );
}
