"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck, CheckCircle2, XCircle, PackageCheck, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  confirmarPedidoCompra,
  marcarPedidoEmTransito,
  cancelarPedidoCompra,
  receberItemPedidoCompra,
  criarPedidoCompra,
} from "@/features/suprimentos/actions/pedido-compra-actions";

interface CotacaoAceitaSemPedido {
  id: string;
  numero: string;
  fornecedorNome: string;
  empreendimentoId: string;
  empreendimentoNome: string;
  totalGeral: number;
  totalItens: number;
  atualizadaEm: Date;
}

interface ItemPedido {
  id: string;
  descricao: string;
  quantidadePedida: number;
  quantidadeRecebida: number;
}

interface Pedido {
  id: string;
  numero: string;
  fornecedorNome: string;
  empreendimentoId: string;
  empreendimentoNome: string;
  status: string;
  dataPedido: Date;
  dataPrevistaEntrega: Date | null;
  totalPedido: number;
  percentualRecebido: number;
  atrasado: boolean;
  itens: ItemPedido[];
}

const CONFIG_STATUS: Record<string, { label: string; classe: string }> = {
  AGUARDANDO_CONFIRMACAO: { label: "Aguardando confirmação", classe: "bg-muted text-muted-foreground" },
  CONFIRMADO: { label: "Confirmado", classe: "bg-primary/10 text-primary" },
  EM_TRANSITO: { label: "Em trânsito", classe: "bg-warning/10 text-warning" },
  ENTREGUE_PARCIAL: { label: "Entregue parcial", classe: "bg-warning/10 text-warning" },
  ENTREGUE_COMPLETO: { label: "Entregue completo", classe: "bg-success/10 text-success" },
  CANCELADO: { label: "Cancelado", classe: "bg-secondary text-muted-foreground" },
};

function formatData(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function PedidosCompraManager({
  pedidosIniciais,
  cotacoesAceitasSemPedido,
}: {
  pedidosIniciais: Pedido[];
  cotacoesAceitasSemPedido: CotacaoAceitaSemPedido[];
}) {
  const router = useRouter();
  const [expandido, setExpandido] = React.useState<string | null>(null);
  const [processando, setProcessando] = React.useState<string | null>(null);
  const [recebendoItem, setRecebendoItem] = React.useState<string | null>(null);
  const [quantidadeInput, setQuantidadeInput] = React.useState("");
  const [dataConfirmacao, setDataConfirmacao] = React.useState<Record<string, string>>({});
  const [gerandoPedido, setGerandoPedido] = React.useState<string | null>(null);
  const [cotacoesRestantes, setCotacoesRestantes] = React.useState(cotacoesAceitasSemPedido);

  async function handleGerarPedido(cotacaoId: string) {
    setGerandoPedido(cotacaoId);
    try {
      const r = await criarPedidoCompra(cotacaoId);
      if ("erro" in r) {
        alert(r.erro);
        return;
      }
      setCotacoesRestantes((prev) => prev.filter((c) => c.id !== cotacaoId));
      router.refresh();
    } finally {
      setGerandoPedido(null);
    }
  }

  async function handleConfirmar(pedidoId: string) {
    const data = dataConfirmacao[pedidoId];
    if (!data) {
      alert("Escolha a data prevista de entrega antes de confirmar.");
      return;
    }
    setProcessando(pedidoId);
    try {
      await confirmarPedidoCompra(pedidoId, data);
      router.refresh();
    } finally {
      setProcessando(null);
    }
  }

  async function handleEmTransito(pedidoId: string) {
    setProcessando(pedidoId);
    try {
      await marcarPedidoEmTransito(pedidoId);
      router.refresh();
    } finally {
      setProcessando(null);
    }
  }

  async function handleCancelar(pedidoId: string) {
    if (!confirm("Cancelar esse pedido de compra?")) return;
    setProcessando(pedidoId);
    try {
      await cancelarPedidoCompra(pedidoId);
      router.refresh();
    } finally {
      setProcessando(null);
    }
  }

  async function handleReceber(itemId: string) {
    const qtd = Number(quantidadeInput.replace(",", "."));
    if (!qtd || qtd <= 0) {
      alert("Digite uma quantidade válida.");
      return;
    }
    setProcessando(itemId);
    try {
      const r = await receberItemPedidoCompra(itemId, qtd);
      if ("erro" in r) alert(r.erro);
      setRecebendoItem(null);
      setQuantidadeInput("");
      router.refresh();
    } finally {
      setProcessando(null);
    }
  }

  const secaoCotacoesAceitas = cotacoesRestantes.length > 0 && (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-primary/30 bg-primary/5">
      <div className="px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Cotações aceitas aguardando virar Pedido de Compra
        </p>
      </div>
      {cotacoesRestantes.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              Cotação {c.numero} — {c.fornecedorNome}
            </span>
            <span className="text-xs text-muted-foreground">
              {c.empreendimentoNome} · {c.totalItens} ite{c.totalItens === 1 ? "m" : "ns"} ·{" "}
              {c.totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => handleGerarPedido(c.id)}
            disabled={gerandoPedido === c.id}
            className="shrink-0"
          >
            {gerandoPedido === c.id && <Loader2 className="h-4 w-4 animate-spin" />}
            Gerar Pedido de Compra
          </Button>
        </div>
      ))}
    </div>
  );

  if (pedidosIniciais.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {secaoCotacoesAceitas}
        <div className="rounded-lg border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          Nenhum pedido de compra ainda. Aceite uma cotação em Orçamentação pra ela aparecer aqui em cima.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {secaoCotacoesAceitas}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
      {pedidosIniciais.map((p) => {
        const cfg = CONFIG_STATUS[p.status] ?? CONFIG_STATUS.AGUARDANDO_CONFIRMACAO!;
        return (
          <div key={p.id}>
            <button
              onClick={() => setExpandido(expandido === p.id ? null : p.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/20"
            >
              <div className="flex items-center gap-3">
                {p.atrasado && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {p.numero} — {p.fornecedorNome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.empreendimentoNome} · previsto {formatData(p.dataPrevistaEntrega)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">{p.percentualRecebido}% recebido</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.classe}`}>
                  {cfg.label}
                </span>
              </div>
            </button>

            {expandido === p.id && (
              <div className="border-t border-border/50 bg-secondary/10 px-4 py-3">
                {/* Ações do pedido, conforme o status atual */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {p.status === "AGUARDANDO_CONFIRMACAO" && (
                    <>
                      <input
                        type="date"
                        value={dataConfirmacao[p.id] ?? ""}
                        onChange={(e) => setDataConfirmacao((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      />
                      <Button size="sm" onClick={() => handleConfirmar(p.id)} disabled={processando === p.id}>
                        {processando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Confirmar com o fornecedor
                      </Button>
                    </>
                  )}
                  {p.status === "CONFIRMADO" && (
                    <Button size="sm" variant="outline" onClick={() => handleEmTransito(p.id)} disabled={processando === p.id}>
                      <Truck className="h-3.5 w-3.5" />
                      Marcar em trânsito
                    </Button>
                  )}
                  {(p.status === "AGUARDANDO_CONFIRMACAO" || p.status === "CONFIRMADO") && (
                    <Button size="sm" variant="outline" onClick={() => handleCancelar(p.id)} disabled={processando === p.id} className="text-destructive">
                      <XCircle className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  )}
                </div>

                {/* Itens do pedido — pedido × recebido, com ação de receber */}
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-muted-foreground">
                        <th className="px-2 py-1.5 text-left font-medium">Material</th>
                        <th className="px-2 py-1.5 text-right font-medium">Pedido</th>
                        <th className="px-2 py-1.5 text-right font-medium">Recebido</th>
                        <th className="px-2 py-1.5 text-right font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {p.itens.map((item) => {
                        const completo = item.quantidadeRecebida >= item.quantidadePedida;
                        return (
                          <tr key={item.id}>
                            <td className="px-2 py-1.5 text-foreground">{item.descricao}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{item.quantidadePedida}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                              {item.quantidadeRecebida}
                              {completo && <PackageCheck className="ml-1 inline h-3 w-3 text-success" />}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {!completo &&
                                (recebendoItem === item.id ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={quantidadeInput}
                                      onChange={(e) => setQuantidadeInput(e.target.value)}
                                      placeholder="qtd"
                                      className="h-7 w-16 rounded-md border border-input bg-background px-1 text-right text-xs"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleReceber(item.id)}
                                      disabled={processando === item.id}
                                      className="rounded-md bg-success/10 px-2 py-1 text-success hover:bg-success/20"
                                    >
                                      {processando === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setRecebendoItem(item.id);
                                      setQuantidadeInput("");
                                    }}
                                    className="text-primary hover:underline"
                                  >
                                    Receber
                                  </button>
                                ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
