"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  PencilLine,
  Trash2,
  Send,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  FileDown,
  FileSpreadsheet,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  atualizarPrecoCotacaoItem,
  mudarStatusCotacao,
  deletarCotacao,
} from "@/features/cotacoes/actions/cotacao-actions";
import { criarPedidoCompra } from "@/features/suprimentos/actions/pedido-compra-actions";

export interface CotacaoDetalhe {
  id: string;
  numero: string;
  status: string;
  fornecedor: {
    nomeExibido: string;
    razaoSocial: string;
    cnpj: string;
  };
  empreendimento: {
    id: string;
    nome: string;
    clienteNome: string;
    obra: string;
  };
  totalEletrica: number;
  totalQdc: number;
  totalGeral: number;
  observacoes: string | null;
  itensNaoCotaveis: { descricao: string; fabricante: string; quantidade: number; kit: string }[];
  itens: CotacaoItemDetalhe[];
  criadaEm: Date;
  atualizadaEm: Date;
}

export interface CotacaoItemDetalhe {
  id: string;
  descricao: string;
  fabricante: string;
  unidade: string;
  kit: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  ordem: number;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatNumero(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

const LABELS_STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada ao fornecedor",
  RESPONDIDA: "Respondida",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

const CORES_STATUS: Record<string, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  ENVIADA: "bg-primary/10 text-primary",
  RESPONDIDA: "bg-warning/10 text-warning",
  ACEITA: "bg-success/10 text-success",
  RECUSADA: "bg-muted text-muted-foreground line-through",
};

export function CotacaoDetailView({ cotacao }: { cotacao: CotacaoDetalhe }) {
  const router = useRouter();

  // Agrupar itens por fabricante (formato QDC)
  const agrupados = React.useMemo(() => {
    const map = new Map<string, CotacaoItemDetalhe[]>();
    // Ordena por ordem inserida primeiro, depois agrupa
    const ord = [...cotacao.itens].sort((a, b) => a.ordem - b.ordem);
    for (const item of ord) {
      const arr = map.get(item.fabricante) ?? [];
      arr.push(item);
      map.set(item.fabricante, arr);
    }
    return Array.from(map.entries());
  }, [cotacao.itens]);

  const editavel = cotacao.status !== "ACEITA" && cotacao.status !== "RECUSADA";

  async function handleMudarStatus(
    novoStatus: "RASCUNHO" | "ENVIADA" | "RESPONDIDA" | "ACEITA" | "RECUSADA"
  ) {
    const r = await mudarStatusCotacao(cotacao.id, novoStatus);
    if (r.erro) alert(r.erro);
    else router.refresh();
  }

  const [gerandoPedido, setGerandoPedido] = React.useState(false);
  async function handleGerarPedido() {
    setGerandoPedido(true);
    try {
      const r = await criarPedidoCompra(cotacao.id);
      if ("erro" in r) {
        alert(r.erro);
        return;
      }
      router.push("/suprimentos/pedidos");
    } finally {
      setGerandoPedido(false);
    }
  }

  async function handleDeletar() {
    if (!confirm(`Deletar a cotação ${cotacao.numero}? Essa ação não pode ser desfeita.`))
      return;
    const r = await deletarCotacao(cotacao.id);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    router.push(`/empreendimentos/${cotacao.empreendimento.id}/orcamento`);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho tipo QDC — logo simulado + info do orçamento + totais */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-stretch">
          {/* Logo do sistema */}
          <div className="flex items-center justify-center border-b md:border-b-0 md:border-r border-border bg-secondary/40 px-6 py-4">
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold text-primary">ConstructApp</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                HGI Group
              </div>
            </div>
          </div>
          {/* Info central */}
          <div className="flex flex-col justify-center gap-1 border-b md:border-b-0 md:border-r border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">ORÇAMENTO</span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase " +
                  (CORES_STATUS[cotacao.status] ?? "")
                }
              >
                {LABELS_STATUS[cotacao.status]}
              </span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {cotacao.numero}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              <div>
                <strong className="text-foreground">CLIENTE:</strong>{" "}
                {cotacao.empreendimento.clienteNome}
              </div>
              <div>
                <strong className="text-foreground">OBRA:</strong> {cotacao.empreendimento.obra}
              </div>
              <div>
                <strong className="text-foreground">FORNECEDOR:</strong>{" "}
                {cotacao.fornecedor.nomeExibido}
              </div>
            </div>
          </div>
          {/* Box de totais — TOTAL ELÉTRICA / TOTAL P/ QDC */}
          <div className="flex flex-col divide-y divide-border px-4 py-2">
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total elétrica
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatBRL(cotacao.totalEletrica)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total p/ QDC
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatBRL(cotacao.totalQdc)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                Total geral
              </span>
              <span className="text-base font-bold tabular-nums text-primary">
                {formatBRL(cotacao.totalGeral)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-2">
        <BotoesFluxoStatus status={cotacao.status} onMudar={handleMudarStatus} />
        <span className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/cotacoes/${cotacao.id}/pdf`, "_blank")}
          title="Abrir PDF em nova aba (layout QDC — pra mandar por WhatsApp/email)"
        >
          <FileDown className="mr-1.5 h-4 w-4" />
          Baixar PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = `/api/cotacoes/${cotacao.id}/csv`)}
          title="Baixar como CSV (abre no Excel PT-BR)"
        >
          <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          Baixar CSV
        </Button>
        {cotacao.status !== "ACEITA" && (
          <Button variant="outline" size="sm" onClick={handleDeletar}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Deletar
          </Button>
        )}
        {cotacao.status === "ACEITA" && (
          <Button size="sm" onClick={handleGerarPedido} disabled={gerandoPedido}>
            {gerandoPedido ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-1.5 h-4 w-4" />}
            Gerar Pedido de Compra
          </Button>
        )}
      </div>

      {/* Aviso de itens não cotáveis */}
      {cotacao.itensNaoCotaveis.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-xs text-warning">
          <strong>{cotacao.itensNaoCotaveis.length} item(s) do levantamento</strong> não estão
          no cadastro deste fornecedor e ficaram de fora desta cotação. Se quiser cotar esses
          itens, cadastre-os na aba <em>Produtos e Preços</em> do fornecedor.
        </div>
      )}

      {/* Tabela agrupada por fabricante */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Descrição</th>
                <th className="px-2 py-2 text-center font-medium w-16">Und</th>
                <th className="px-2 py-2 text-right font-medium w-24">Qtde</th>
                <th className="px-2 py-2 text-right font-medium w-32">Valor Unit.</th>
                <th className="px-2 py-2 text-right font-medium w-32">Valor Total</th>
                <th className="px-2 py-2 text-center font-medium w-16">Kit</th>
              </tr>
            </thead>
            <tbody>
              {agrupados.map(([fabricante, itens]) => {
                const subtotal = itens.reduce((s, i) => s + Number(i.total), 0);
                return (
                  <React.Fragment key={fabricante}>
                    {/* Faixa colorida do fabricante */}
                    <tr className="bg-primary/5 border-y border-border">
                      <td colSpan={6} className="px-4 py-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                          {fabricante}
                        </span>
                      </td>
                    </tr>
                    {itens.map((item) => (
                      <LinhaItem key={item.id} item={item} editavel={editavel} />
                    ))}
                    {/* Subtotal do fabricante */}
                    <tr className="border-b border-border/60 bg-secondary/20">
                      <td colSpan={4} className="px-4 py-1.5 text-right text-xs font-medium text-muted-foreground">
                        Subtotal {fabricante}
                      </td>
                      <td className="px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-foreground">
                        {formatBRL(subtotal)}
                      </td>
                      <td />
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BotoesFluxoStatus({
  status,
  onMudar,
}: {
  status: string;
  onMudar: (
    n: "RASCUNHO" | "ENVIADA" | "RESPONDIDA" | "ACEITA" | "RECUSADA"
  ) => Promise<void>;
}) {
  // Fluxo natural: RASCUNHO → ENVIADA → RESPONDIDA → ACEITA/RECUSADA
  // Cada botão sinaliza o próximo passo, sem esconder o retorno.
  const botoes: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    proximo: "RASCUNHO" | "ENVIADA" | "RESPONDIDA" | "ACEITA" | "RECUSADA";
    variant: "default" | "outline";
  }[] = [];

  if (status === "RASCUNHO") {
    botoes.push({ label: "Marcar como enviada", icon: Send, proximo: "ENVIADA", variant: "default" });
  }
  if (status === "ENVIADA") {
    botoes.push({
      label: "Marcar como respondida",
      icon: RotateCcw,
      proximo: "RESPONDIDA",
      variant: "default",
    });
  }
  if (status === "RESPONDIDA" || status === "ENVIADA") {
    botoes.push({ label: "Aceitar", icon: ThumbsUp, proximo: "ACEITA", variant: "default" });
    botoes.push({ label: "Recusar", icon: ThumbsDown, proximo: "RECUSADA", variant: "outline" });
  }
  if (status === "ACEITA" || status === "RECUSADA") {
    botoes.push({
      label: "Voltar a rascunho",
      icon: RotateCcw,
      proximo: "RASCUNHO",
      variant: "outline",
    });
  }

  return (
    <>
      {botoes.map((b) => {
        const Icon = b.icon;
        return (
          <Button key={b.proximo} size="sm" variant={b.variant} onClick={() => onMudar(b.proximo)}>
            <Icon className="mr-1.5 h-4 w-4" />
            {b.label}
          </Button>
        );
      })}
    </>
  );
}

function LinhaItem({
  item,
  editavel,
}: {
  item: CotacaoItemDetalhe;
  editavel: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [valor, setValor] = React.useState(String(item.precoUnitario));
  const [salvando, setSalvando] = React.useState(false);

  async function salvar() {
    const novo = Number(valor.replace(",", "."));
    if (!Number.isFinite(novo) || novo < 0) {
      alert("Preço inválido.");
      return;
    }
    if (novo === item.precoUnitario) {
      setEditando(false);
      return;
    }
    setSalvando(true);
    const r = await atualizarPrecoCotacaoItem(item.id, novo);
    setSalvando(false);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  return (
    <tr className="border-b border-border/40 hover:bg-secondary/20">
      <td className="px-4 py-1.5 text-sm text-foreground">{item.descricao}</td>
      <td className="px-2 py-1.5 text-center text-xs uppercase text-muted-foreground">
        {item.unidade}
      </td>
      <td className="px-2 py-1.5 text-right text-sm tabular-nums text-foreground">
        {formatNumero(item.quantidade)}
      </td>
      <td className="px-2 py-1.5 text-right text-sm tabular-nums text-foreground">
        {editando ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") salvar();
                if (e.key === "Escape") {
                  setValor(String(item.precoUnitario));
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
            >
              {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </button>
          </div>
        ) : (
          <button
            onClick={editavel ? () => setEditando(true) : undefined}
            disabled={!editavel}
            className={
              "group inline-flex items-center justify-end gap-1 " +
              (editavel ? "hover:text-primary" : "cursor-default")
            }
          >
            {formatBRL(item.precoUnitario)}
            {editavel && (
              <PencilLine className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </button>
        )}
      </td>
      <td className="px-2 py-1.5 text-right text-sm font-medium tabular-nums text-foreground">
        {formatBRL(item.total)}
      </td>
      <td className="px-2 py-1.5 text-center">
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
          {item.kit}
        </span>
      </td>
    </tr>
  );
}
