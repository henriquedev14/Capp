"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Phone, MessageSquare, CheckCircle2, XCircle, RotateCcw, Loader2, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { registrarInteracao } from "@/features/negociacao/actions/negociacao-actions";
import { ModalConfirmarContrato } from "@/features/negociacao/components/modal-confirmar-contrato";
import type { CotacaoDetalhe } from "@/features/cotacoes/components/cotacao-detail-view";
import type { InteracaoTimeline } from "@/features/negociacao/actions/negociacao-actions";
import type { StatusNegociacao } from "@/core/negociacao/use-cases/status-negociacao";

const LABELS_STATUS: Record<StatusNegociacao, { label: string; classe: string }> = {
  AGUARDANDO_CLIENTE: { label: "Aguardando cliente", classe: "bg-primary/10 text-primary" },
  EM_REVISAO: { label: "Em revisão", classe: "bg-warning/10 text-warning" },
  APROVADA: { label: "Aprovada", classe: "bg-success/10 text-success" },
  RECUSADA: { label: "Recusada", classe: "bg-destructive/10 text-destructive" },
  RETORNOU_ENGENHARIA: { label: "Retornou p/ engenharia", classe: "bg-muted text-muted-foreground" },
};

const LABELS_TIPO_TIMELINE: Record<string, string> = {
  CONTATO: "Contato",
  CONTRAPROPOSTA: "Contraproposta",
  GANHA: "Ganha",
  PERDIDA: "Perdida",
  RETORNO_ENGENHARIA: "Retornou pra Engenharia",
  COTACAO_ENVIADA: "Cotação enviada",
};

const LABELS_MOTIVO_PERDA: Record<string, string> = {
  PRECO: "Preço",
  PRAZO: "Prazo",
  ESCOPO: "Escopo",
  CONCORRENCIA: "Concorrência",
  DESISTIU: "Cliente desistiu",
  OUTRO: "Outro",
};

interface Props {
  empreendimentoId: string;
  cotacoes: CotacaoDetalhe[];
  interacoes: InteracaoTimeline[];
  status: StatusNegociacao;
  valorOriginal: number;
  valorAtual: number;
  prioridade: "normal" | "atencao" | "critica";
  diasSemInteracao: number;
  followUpVencido: boolean;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

type FormAberto = "CONTATO" | "CONTRAPROPOSTA" | "PERDIDA" | "RETORNO_ENGENHARIA" | null;

export function NegociacaoView({
  empreendimentoId,
  cotacoes,
  interacoes,
  status,
  valorOriginal,
  valorAtual,
  followUpVencido,
}: Props) {
  const router = useRouter();
  const [formAberto, setFormAberto] = React.useState<FormAberto>(null);
  const [modalContratoAberto, setModalContratoAberto] = React.useState(false);
  const [valorNegociado, setValorNegociado] = React.useState(valorAtual);
  const [motivoPerda, setMotivoPerda] = React.useState("PRECO");
  const [observacoes, setObservacoes] = React.useState("");
  const [proximaAcao, setProximaAcao] = React.useState("");
  const [proximaAcaoData, setProximaAcaoData] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const desconto = valorOriginal > 0 ? ((valorOriginal - valorAtual) / valorOriginal) * 100 : 0;
  const podeAgir = status === "AGUARDANDO_CLIENTE" || status === "EM_REVISAO";

  function limparForm() {
    setFormAberto(null);
    setObservacoes("");
    setProximaAcao("");
    setProximaAcaoData("");
    setErro(null);
  }

  async function handleSalvar() {
    if (!formAberto) return;
    setErro(null);
    setSalvando(true);
    try {
      const r = await registrarInteracao({
        empreendimentoId,
        tipo: formAberto,
        valorNegociado: formAberto === "CONTRAPROPOSTA" ? valorNegociado : undefined,
        motivoPerda: formAberto === "PERDIDA" ? motivoPerda : undefined,
        observacoes,
        proximaAcao: proximaAcao || undefined,
        proximaAcaoData: proximaAcaoData || undefined,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      limparForm();
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {followUpVencido && (
        <div className="flex items-center gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Follow-up vencido — retome o contato com o cliente
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between border-b border-border">
          <CardTitle className="text-[15px]">Status da negociação</CardTitle>
          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${LABELS_STATUS[status].classe}`}>
            {LABELS_STATUS[status].label}
          </span>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex gap-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Valor original</p>
              <p className="mt-1 text-lg font-medium text-muted-foreground line-through decoration-border">
                {formatBRL(valorOriginal)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Valor negociado atual</p>
              <p className="mt-1 text-2xl font-bold text-primary">{formatBRL(valorAtual)}</p>
              {desconto > 0 && (
                <span className="mt-1 inline-block rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                  Desconto de {desconto.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {podeAgir && !formAberto && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setFormAberto("CONTATO")}>
                <Phone className="mr-1.5 h-3.5 w-3.5" />
                Registrar contato
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFormAberto("CONTRAPROPOSTA")}>
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Contraproposta
              </Button>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => setModalContratoAberto(true)}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Ganha
              </Button>
              <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => setFormAberto("PERDIDA")}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Perdida
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFormAberto("RETORNO_ENGENHARIA")}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Retornar p/ Engenharia
              </Button>
            </div>
          )}

          {formAberto && (
            <div className="mt-5 flex flex-col gap-3 rounded-lg border border-border bg-secondary/20 p-4">
              <p className="text-sm font-semibold">
                {formAberto === "CONTATO" && "Registrar contato"}
                {formAberto === "CONTRAPROPOSTA" && "Registrar contraproposta"}
                {formAberto === "PERDIDA" && "Registrar recusa"}
                {formAberto === "RETORNO_ENGENHARIA" && "Enviar de volta pra Engenharia"}
              </p>

              {formAberto === "RETORNO_ENGENHARIA" && (
                <p className="text-xs text-muted-foreground">
                  Isso reabre o orçamento e zera a aprovação do gestor — vai precisar ser reaprovado antes de voltar pra
                  Negociação.
                </p>
              )}

              {formAberto === "CONTRAPROPOSTA" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Novo valor negociado</label>
                  <input
                    type="number"
                    value={valorNegociado}
                    onChange={(e) => setValorNegociado(parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
              )}

              {formAberto === "PERDIDA" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Motivo</label>
                  <select
                    value={motivoPerda}
                    onChange={(e) => setMotivoPerda(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {Object.entries(LABELS_MOTIVO_PERDA).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {formAberto !== "PERDIDA" && formAberto !== "RETORNO_ENGENHARIA" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Próxima ação</label>
                    <input
                      value={proximaAcao}
                      onChange={(e) => setProximaAcao(e.target.value)}
                      placeholder="Ex: ligar de novo"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Data prevista</label>
                    <input
                      type="date"
                      value={proximaAcaoData}
                      onChange={(e) => setProximaAcaoData(e.target.value)}
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              )}

              {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>}

              <div className="flex gap-2">
                <Button onClick={handleSalvar} disabled={salvando}>
                  {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Confirmar
                </Button>
                <Button variant="outline" onClick={limparForm} disabled={salvando}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2.5 border-b border-border">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-[15px]">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {interacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
          ) : (
            <div className="flex flex-col">
              {interacoes.map((i, idx) => (
                <div key={i.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {idx < interacoes.length - 1 && (
                    <div className="absolute bottom-0 left-[5px] top-4 w-px bg-border" />
                  )}
                  <div className="z-10 mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-[10.5px] font-medium text-muted-foreground">
                      {new Date(i.createdAt).toLocaleDateString("pt-BR")} · {i.registradoPorNome}
                    </p>
                    <p className="text-[13px] font-semibold">
                      {LABELS_TIPO_TIMELINE[i.tipo] ?? i.tipo}
                      {i.valorNegociado != null && ` — ${formatBRL(i.valorNegociado)}`}
                    </p>
                    {i.motivoPerda && (
                      <p className="text-xs text-muted-foreground">Motivo: {LABELS_MOTIVO_PERDA[i.motivoPerda] ?? i.motivoPerda}</p>
                    )}
                    {i.observacoes && <p className="mt-0.5 text-xs text-muted-foreground">{i.observacoes}</p>}
                    {i.proximaAcao && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        Próxima ação: {i.proximaAcao}
                        {i.proximaAcaoData && ` (${new Date(i.proximaAcaoData).toLocaleDateString("pt-BR")})`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {cotacoes.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Cotação enviada</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-2">
              {cotacoes
                .filter((c) => c.status !== "RECUSADA")
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5">
                    <span className="text-sm font-medium">{c.fornecedor.nomeExibido}</span>
                    <span className="font-mono text-sm font-semibold">{formatBRL(c.totalGeral)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {modalContratoAberto && (
        <ModalConfirmarContrato empreendimentoId={empreendimentoId} onFechar={() => setModalContratoAberto(false)} />
      )}
    </div>
  );
}
