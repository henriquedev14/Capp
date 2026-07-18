"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Undo2, Loader2, Pencil, X, Truck, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  marcarContaReceberComoRecebida,
  desfazerRecebimentoConta,
  atualizarContaReceber,
  registrarEnvioRemessa,
  definirDataProjetada,
} from "@/features/financeiro/actions/conta-receber-actions";

export interface ContaReceberItem {
  id: string;
  empreendimentoId: string;
  empreendimentoNome: string;
  tipo: "ENTRADA" | "REMESSA";
  pavimentoNome: string | null;
  valor: number;
  dataEnvio: string | null;
  dataPrevista: string | null; // null = sem cronograma nem envio ainda
  recebido: boolean;
  empresaId: string | null;
  empresaNome: string | null;
}

interface Props {
  contas: ContaReceberItem[];
  empresas: { id: string; nome: string }[];
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ContasReceberManager({ contas, empresas }: Props) {
  const router = useRouter();
  const [processandoId, setProcessandoId] = React.useState<string | null>(null);
  const [editandoId, setEditandoId] = React.useState<string | null>(null);
  const [empresaEdit, setEmpresaEdit] = React.useState("");
  const [dataEdit, setDataEdit] = React.useState("");
  const [valorEdit, setValorEdit] = React.useState("");
  const [modoDataId, setModoDataId] = React.useState<string | null>(null);
  const [tipoAcaoData, setTipoAcaoData] = React.useState<"projetar" | "confirmar">("projetar");
  const [dataInput, setDataInput] = React.useState(new Date().toISOString().slice(0, 10));

  // Três estados possíveis pra uma remessa:
  //  1. Sem cronograma nenhum (dataPrevista null) — Comercial precisa
  //     preencher uma estimativa, senão some da projeção de faturamento.
  //  2. Projetada (dataPrevista existe, dataEnvio ainda null) — já entra
  //     na projeção, mas ainda é uma estimativa, não confirmado de verdade.
  //  3. Confirmada (dataEnvio existe) — pavimento saiu de fato, data real.
  //
  // "Em atraso" é uma condição TRANSVERSAL a essas três — qualquer conta
  // não recebida cuja data prevista já passou vira atraso, e ganha seção
  // própria em destaque (antes ficava misturada na lista normal, sem
  // nenhum aviso visual de que já passou do prazo).
  const hoje = new Date();
  const emAtraso = contas.filter((c) => !c.recebido && c.dataPrevista && new Date(c.dataPrevista) < hoje);
  const idsEmAtraso = new Set(emAtraso.map((c) => c.id));
  const semCronograma = contas.filter((c) => c.tipo === "REMESSA" && !c.dataPrevista);
  const projetadas = contas.filter(
    (c) => c.tipo === "REMESSA" && c.dataPrevista && !c.dataEnvio && !c.recebido && !idsEmAtraso.has(c.id)
  );
  const confirmadasPendentes = contas.filter(
    (c) => (c.tipo === "ENTRADA" || c.dataEnvio) && !c.recebido && !idsEmAtraso.has(c.id)
  );
  const recebidas = contas.filter((c) => c.recebido);

  const totalEmAtraso = emAtraso.reduce((s, c) => s + c.valor, 0);
  const totalPendente = [...projetadas, ...confirmadasPendentes].reduce((s, c) => s + c.valor, 0);
  const totalSemCronograma = semCronograma.reduce((s, c) => s + c.valor, 0);

  // Alerta de conferência — contas que venceram EXATAMENTE ontem (não
  // qualquer atraso, que já tem a seção própria acima) e ainda não foram
  // marcadas como recebidas. É o gatilho pra "conferir se caiu na conta"
  // logo no dia seguinte ao vencimento, antes de virar um atraso mais
  // longo sem ninguém perceber. Aparece uma vez por visita à tela (fecha
  // e não volta a aparecer até recarregar).
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const venceuOntem = contas.filter(
    (c) =>
      !c.recebido &&
      c.dataPrevista &&
      new Date(c.dataPrevista).toDateString() === ontem.toDateString()
  );
  const [alertaAberto, setAlertaAberto] = React.useState(venceuOntem.length > 0);

  async function handleReceber(id: string) {
    setProcessandoId(id);
    try {
      const r = await marcarContaReceberComoRecebida(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleDesfazer(id: string) {
    setProcessandoId(id);
    try {
      const r = await desfazerRecebimentoConta(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessandoId(null);
    }
  }

  function abrirEdicao(c: ContaReceberItem) {
    setEditandoId(c.id);
    setEmpresaEdit(c.empresaId ?? "");
    setDataEdit(c.dataPrevista ? c.dataPrevista.slice(0, 10) : "");
    setValorEdit(String(c.valor));
  }

  async function salvarEdicao(id: string) {
    setProcessandoId(id);
    try {
      const r = await atualizarContaReceber(id, {
        empresaId: empresaEdit || null,
        dataPrevista: dataEdit,
        valor: Number(valorEdit.replace(",", ".")),
      });
      if (r.erro) {
        alert(r.erro);
        return;
      }
      setEditandoId(null);
      router.refresh();
    } finally {
      setProcessandoId(null);
    }
  }

  function abrirModoData(id: string, tipo: "projetar" | "confirmar") {
    setModoDataId(id);
    setTipoAcaoData(tipo);
    setDataInput(new Date().toISOString().slice(0, 10));
  }

  async function confirmarData(id: string) {
    setProcessandoId(id);
    try {
      const r =
        tipoAcaoData === "projetar"
          ? await definirDataProjetada(id, dataInput)
          : await registrarEnvioRemessa(id, dataInput);
      if (r.erro) {
        alert(r.erro);
        return;
      }
      setModoDataId(null);
      router.refresh();
    } finally {
      setProcessandoId(null);
    }
  }

  function linhaLabel(c: ContaReceberItem): string {
    if (c.tipo === "ENTRADA") return "Entrada (20%)";
    if (c.pavimentoNome) return `Remessa — ${c.pavimentoNome}`;
    return "Remessa";
  }

  function BotaoData({ id, tipo, texto }: { id: string; tipo: "projetar" | "confirmar"; texto: string }) {
    if (modoDataId === id) {
      return (
        <>
          <input
            type="date"
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            className="rounded border border-input bg-background px-1.5 py-1 text-xs"
          />
          <button onClick={() => confirmarData(id)} className="rounded p-1 text-success hover:bg-success/10">
            {processandoId === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setModoDataId(null)} className="rounded p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      );
    }
    return (
      <Button size="sm" variant="outline" onClick={() => abrirModoData(id, tipo)}>
        {tipo === "projetar" ? <CalendarClock className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
        {texto}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Pop-up de conferência — contas que venceram ontem, ainda não
          marcadas como recebidas. Fecha e some (não trava a tela), mas
          aparece de novo a cada carregamento enquanto a conta continuar
          sem ser marcada. */}
      {alertaAberto && venceuOntem.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-warning/30 bg-card p-5 shadow-lg">
            <div className="flex items-center gap-2 text-warning">
              <CalendarClock className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Confira o recebimento de ontem</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {venceuOntem.length === 1
                ? "Uma conta venceu ontem e ainda não foi marcada como recebida."
                : `${venceuOntem.length} contas venceram ontem e ainda não foram marcadas como recebidas.`}{" "}
              Confirma se o pagamento caiu antes de seguir.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {venceuOntem.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md bg-warning/5 px-3 py-1.5 text-xs">
                  <span className="truncate text-foreground">{c.empreendimentoNome} — {linhaLabel(c)}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatBRL(c.valor)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" onClick={() => setAlertaAberto(false)}>
                Já verifiquei, continuar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-5">
            <span className="text-xs font-medium uppercase tracking-wide text-destructive">Em atraso</span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-destructive">{formatBRL(totalEmAtraso)}</div>
          </CardContent>
        </Card>
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-5">
            <span className="text-xs font-medium uppercase tracking-wide text-success">A receber (com data)</span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-success">{formatBRL(totalPendente)}</div>
          </CardContent>
        </Card>
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="pt-5">
            <span className="text-xs font-medium uppercase tracking-wide text-warning">Sem cronograma ainda</span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-warning">{formatBRL(totalSemCronograma)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Em atraso — passou da data prevista e ainda não foi marcado como
          recebido. Seção própria, em destaque, antes de tudo — é o que
          mais precisa de atenção imediata do Financeiro. */}
      {emAtraso.length > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="p-0">
            <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-destructive">
              Em atraso — verificar recebimento ({emAtraso.length})
            </div>
            <div className="flex flex-col divide-y divide-border">
              {emAtraso.map((c) => {
                const dias = c.dataPrevista
                  ? Math.floor((hoje.getTime() - new Date(c.dataPrevista).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const podeReceber = c.tipo === "ENTRADA" || !!c.dataEnvio;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={`/empreendimentos/${c.empreendimentoId}`}
                        className="text-sm font-medium text-foreground hover:text-primary truncate"
                      >
                        {c.empreendimentoNome}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {linhaLabel(c)} · previsto {c.dataPrevista ? formatData(c.dataPrevista) : "—"} ·{" "}
                        <span className="font-medium text-destructive">{dias}d de atraso</span>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(c.valor)}</span>
                      {podeReceber ? (
                        <Button size="sm" variant="outline" onClick={() => handleReceber(c.id)} disabled={processandoId === c.id}>
                          {processandoId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Receber
                        </Button>
                      ) : (
                        <BotaoData id={c.id} tipo="confirmar" texto="Confirmar envio" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sem cronograma — Comercial precisa preencher uma data estimada,
          senão essa remessa fica invisível pra qualquer projeção de
          faturamento (Fluxo de Caixa, Receita Prevista no Analytics). */}
      {semCronograma.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border bg-warning/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-warning">
              Sem cronograma — preencher a previsão ({semCronograma.length})
            </div>
            <div className="flex flex-col divide-y divide-border">
              {semCronograma.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <Link href={`/empreendimentos/${c.empreendimentoId}`} className="text-sm font-medium text-foreground hover:text-primary truncate">
                      {c.empreendimentoNome}
                    </Link>
                    <span className="text-xs text-muted-foreground">{linhaLabel(c)}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(c.valor)}</span>
                    <BotaoData id={c.id} tipo="projetar" texto="Definir data prevista" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Com data — projetadas (estimativa) ou confirmadas, e recebidas */}
      <Card>
        <CardContent className="p-0">
          {contas.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma conta a receber ainda — nasce automaticamente quando um empreendimento vira Contratado.
            </p>
          ) : [...projetadas, ...confirmadasPendentes, ...recebidas].length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma parcela com data definida ainda — preencha o cronograma acima.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {[...projetadas, ...confirmadasPendentes, ...recebidas].map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <Link href={`/empreendimentos/${c.empreendimentoId}`} className="text-sm font-medium text-foreground hover:text-primary truncate">
                      {c.empreendimentoNome}
                    </Link>
                    <span className="text-xs text-muted-foreground truncate">{linhaLabel(c)}</span>
                    {editandoId === c.id ? (
                      <div className="mt-1 flex items-center gap-2">
                        <select
                          value={empresaEdit}
                          onChange={(e) => setEmpresaEdit(e.target.value)}
                          className="rounded border border-input bg-background px-1.5 py-0.5 text-xs"
                        >
                          <option value="">Sem empresa</option>
                          {empresas.map((e) => (
                            <option key={e.id} value={e.id}>{e.nome}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={dataEdit}
                          onChange={(e) => setDataEdit(e.target.value)}
                          className="rounded border border-input bg-background px-1.5 py-0.5 text-xs"
                        />
                        <input
                          value={valorEdit}
                          onChange={(e) => setValorEdit(e.target.value)}
                          placeholder="Valor"
                          className="w-20 rounded border border-input bg-background px-1.5 py-0.5 text-xs"
                        />
                        <button onClick={() => salvarEdicao(c.id)} className="rounded p-1 text-success hover:bg-success/10">
                          {processandoId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => setEditandoId(null)} className="rounded p-1 text-muted-foreground hover:bg-secondary">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => abrirEdicao(c)}
                        className="mt-0.5 flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {c.empresaNome ?? "Sem empresa"} · previsto {c.dataPrevista ? formatData(c.dataPrevista) : "—"}
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.recebido && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium uppercase text-success">
                        Recebido
                      </span>
                    )}
                    {!c.recebido && c.tipo === "REMESSA" && !c.dataEnvio && (
                      <span
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary"
                        title="Data estimada pelo Comercial — ainda não confirmada pela produção"
                      >
                        Projetado
                      </span>
                    )}
                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(c.valor)}</span>

                    {!c.recebido && c.tipo === "REMESSA" && !c.dataEnvio && (
                      <BotaoData id={c.id} tipo="confirmar" texto="Confirmar envio" />
                    )}

                    {c.recebido ? (
                      <button
                        onClick={() => handleDesfazer(c.id)}
                        disabled={processandoId === c.id}
                        className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
                        title="Desfazer recebimento"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      // "Receber" só faz sentido depois que o envio foi confirmado
                      // de verdade (ou pra Entrada, que não depende de produção) —
                      // uma remessa ainda só projetada não pode ser dada como
                      // recebida, o dinheiro ainda não tem base real pra existir.
                      (c.tipo === "ENTRADA" || c.dataEnvio) && (
                        <Button size="sm" variant="outline" onClick={() => handleReceber(c.id)} disabled={processandoId === c.id}>
                          {processandoId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Receber
                        </Button>
                      )
                    )}
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
