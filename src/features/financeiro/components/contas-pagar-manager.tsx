"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Check,
  Trash2,
  X,
  RefreshCw,
  AlertTriangle,
  Pencil,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  criarContaAvulsa,
  criarParcelamento,
  marcarContaComoPaga,
  excluirContaPagar,
  editarContaPagar,
} from "@/features/financeiro/actions/conta-pagar-actions";
import { gerarContasFixasDoMes } from "@/features/financeiro/actions/conta-fixa-actions";
import { calcularPrioridade } from "@/features/financeiro/lib/fluxo-caixa";

interface OpcaoSimples {
  id: string;
  nome: string;
}

export interface ContaPagarItem {
  id: string;
  descricao: string;
  tipo: "FIXA" | "PARCELADA" | "AVULSA";
  valor: number;
  dataVencimento: string; // ISO
  pago: boolean;
  parcelaAtual: number | null;
  parcelaTotal: number | null;
  empresaNome: string;
  categoriaNome: string;
}

interface Props {
  empresas: OpcaoSimples[];
  categorias: OpcaoSimples[];
  contas: ContaPagarItem[];
  totalPagoEsteMes: number;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// "Pagas" saiu daqui — vive em /financeiro/contas-pagas agora, pra manter
// essa tela só com o que ainda precisa de atenção.
type Filtro = "TODAS" | "VENCIDAS" | "PREVISTAS";

export function ContasPagarManager({ empresas, categorias, contas, totalPagoEsteMes }: Props) {
  const router = useRouter();
  const [filtro, setFiltro] = React.useState<Filtro>("TODAS");
  const [modalAberto, setModalAberto] = React.useState<"avulsa" | "parcelamento" | null>(null);
  const [editandoConta, setEditandoConta] = React.useState<ContaPagarItem | null>(null);
  const [gerandoMes, setGerandoMes] = React.useState(false);
  const [processandoId, setProcessandoId] = React.useState<string | null>(null);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Essa lista só recebe contas pendentes (pago=false) — pagas vivem em
  // /financeiro/contas-pagas — então status é sempre calculado assumindo
  // "ainda não paga".
  const contasComStatus = contas.map((c) => {
    const vencimento = new Date(c.dataVencimento);
    const vencida = vencimento < hoje;
    const prioridade = calcularPrioridade(vencimento, hoje);
    return { ...c, vencida, prioridade };
  });

  // Dentro de cada filtro, prioriza o que precisa de atenção primeiro —
  // mesma lógica que a aba "EM ABERTO - VENCIDOS" fazia manualmente
  // (agrupar por urgência antes de decidir o que pagar).
  const ordemPrioridade = { ALTA: 0, MEDIA: 1, BAIXA: 2 } as const;

  const totais = {
    vencidas: contasComStatus.filter((c) => c.vencida).reduce((s, c) => s + c.valor, 0),
    previstas: contasComStatus.filter((c) => !c.vencida).reduce((s, c) => s + c.valor, 0),
  };

  const contasFiltradas = contasComStatus
    .filter((c) => {
      if (filtro === "VENCIDAS") return c.vencida;
      if (filtro === "PREVISTAS") return !c.vencida;
      return true;
    })
    .sort((a, b) => {
      if (!a.prioridade || !b.prioridade) return 0;
      return ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade];
    });

  async function handleGerarMes() {
    setGerandoMes(true);
    try {
      const r = await gerarContasFixasDoMes(hoje.getFullYear(), hoje.getMonth() + 1);
      if (r.erro) {
        alert(r.erro);
        return;
      }
      alert(`${r.geradas ?? 0} conta(s) fixa(s) gerada(s) para este mês.`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setGerandoMes(false);
    }
  }

  async function handleMarcarPaga(id: string) {
    setProcessandoId(id);
    try {
      const r = await marcarContaComoPaga(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleExcluir(id: string, descricao: string) {
    if (!confirm(`Excluir "${descricao}"?`)) return;
    setProcessandoId(id);
    try {
      const r = await excluirContaPagar(id);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setProcessandoId(null);
    }
  }

  const semCadastroBase = empresas.length === 0 || categorias.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {semCadastroBase && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          Cadastre pelo menos uma <strong>Empresa do Grupo</strong> e uma <strong>Categoria de Despesa</strong> antes de lançar contas.
        </div>
      )}

      {/* KPIs de topo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Vencidas" valor={totais.vencidas} tone="danger" />
        <KpiCard label="Previstas (a vencer)" valor={totais.previstas} tone="warning" />
        <Link href="/financeiro/contas-pagas" className="block">
          <Card className="border-success/40 bg-success/5 text-success transition-colors hover:bg-success/10">
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide opacity-80">Pagas este mês</span>
                <div className="mt-1 text-2xl font-bold tabular-nums">{formatBRL(totalPagoEsteMes)}</div>
              </div>
              <ArrowRight className="h-4 w-4 opacity-60" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setModalAberto("avulsa")} disabled={semCadastroBase}>
          <Plus className="h-4 w-4" />
          Conta avulsa
        </Button>
        <Button size="sm" variant="outline" onClick={() => setModalAberto("parcelamento")} disabled={semCadastroBase}>
          <Plus className="h-4 w-4" />
          Parcelamento
        </Button>
        <Button size="sm" variant="outline" onClick={handleGerarMes} disabled={gerandoMes}>
          {gerandoMes ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Gerar contas fixas do mês
        </Button>

        <div className="ml-auto flex gap-1 rounded-lg border border-border bg-secondary/40 p-1">
          {(["TODAS", "VENCIDAS", "PREVISTAS"] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                (filtro === f ? "bg-background text-foreground shadow-card-sm" : "text-muted-foreground hover:text-foreground")
              }
            >
              {f === "TODAS" ? "Todas" : f === "VENCIDAS" ? "Vencidas" : "Previstas"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {contasFiltradas.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma conta nesta visão.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {contasFiltradas.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-foreground truncate">
                      {c.descricao}
                      {c.tipo === "PARCELADA" && c.parcelaAtual && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          ({c.parcelaAtual}/{c.parcelaTotal})
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {c.empresaNome} · {c.categoriaNome} · vence {formatData(c.dataVencimento)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.prioridade && (
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase " +
                          (c.prioridade === "ALTA"
                            ? "bg-destructive/15 text-destructive"
                            : c.prioridade === "MEDIA"
                            ? "bg-warning/15 text-warning"
                            : "bg-muted text-muted-foreground")
                        }
                        title={
                          c.prioridade === "ALTA"
                            ? "Vencida ou vence em até 3 dias"
                            : c.prioridade === "MEDIA"
                            ? "Vence entre 4 e 10 dias"
                            : "Vence depois de 10 dias"
                        }
                      >
                        {c.vencida ? "Vencida" : c.prioridade === "ALTA" ? "Urgente" : c.prioridade === "MEDIA" ? "Em breve" : "Tranquila"}
                      </span>
                    )}
                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(c.valor)}</span>
                    <button
                      onClick={() => handleMarcarPaga(c.id)}
                      disabled={processandoId === c.id}
                      className="rounded p-1.5 text-muted-foreground hover:bg-success/10 hover:text-success"
                      title="Marcar como paga"
                    >
                      {processandoId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => setEditandoConta(c)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleExcluir(c.id, c.descricao)}
                      disabled={processandoId === c.id}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalAberto === "avulsa" && (
        <ModalContaAvulsa empresas={empresas} categorias={categorias} onFechar={() => setModalAberto(null)} />
      )}
      {modalAberto === "parcelamento" && (
        <ModalParcelamento empresas={empresas} categorias={categorias} onFechar={() => setModalAberto(null)} />
      )}
      {editandoConta && (
        <ModalEditarConta
          conta={editandoConta}
          empresas={empresas}
          categorias={categorias}
          onFechar={() => setEditandoConta(null)}
        />
      )}
    </div>
  );
}

function KpiCard({ label, valor, tone }: { label: string; valor: number; tone: "danger" | "warning" | "success" }) {
  const cores = {
    danger: "border-destructive/40 bg-destructive/5 text-destructive",
    warning: "border-warning/40 bg-warning/5 text-warning",
    success: "border-success/40 bg-success/5 text-success",
  }[tone];
  return (
    <Card className={cores}>
      <CardContent className="pt-5">
        <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
        <div className="mt-1 text-2xl font-bold tabular-nums">{formatBRL(valor)}</div>
      </CardContent>
    </Card>
  );
}

function ModalContaAvulsa({
  empresas,
  categorias,
  onFechar,
}: {
  empresas: OpcaoSimples[];
  categorias: OpcaoSimples[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    empresaId: empresas[0]?.id ?? "",
    categoriaId: categorias[0]?.id ?? "",
    descricao: "",
    valor: "",
    dataVencimento: new Date().toISOString().slice(0, 10),
    observacoes: "",
  });

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const r = await criarContaAvulsa({
        ...form,
        valor: Number(form.valor.replace(",", ".")),
      });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      onFechar();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalBase titulo="Lançar conta avulsa" onFechar={onFechar}>
      <CamposComuns empresas={empresas} categorias={categorias} form={form} setForm={setForm} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Data de vencimento</label>
        <input
          type="date"
          value={form.dataVencimento}
          onChange={(e) => setForm((f) => ({ ...f, dataVencimento: e.target.value }))}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        />
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onFechar} disabled={salvando}>Cancelar</Button>
        <Button size="sm" onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </ModalBase>
  );
}

function ModalParcelamento({
  empresas,
  categorias,
  onFechar,
}: {
  empresas: OpcaoSimples[];
  categorias: OpcaoSimples[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    empresaId: empresas[0]?.id ?? "",
    categoriaId: categorias[0]?.id ?? "",
    descricao: "",
    valor: "", // reaproveita o campo "valor" como valor da parcela
    dataVencimento: new Date().toISOString().slice(0, 10), // primeira parcela
    observacoes: "",
    totalParcelas: "12",
  });

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const r = await criarParcelamento({
        empresaId: form.empresaId,
        categoriaId: form.categoriaId,
        descricao: form.descricao,
        valorParcela: Number(form.valor.replace(",", ".")),
        totalParcelas: parseInt(form.totalParcelas, 10),
        primeiroVencimento: form.dataVencimento,
        observacoes: form.observacoes,
      });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      onFechar();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalBase titulo="Lançar parcelamento" onFechar={onFechar}>
      <CamposComuns empresas={empresas} categorias={categorias} form={form} setForm={setForm} labelValor="Valor de cada parcela (R$)" />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">1ª parcela vence em</label>
          <input
            type="date"
            value={form.dataVencimento}
            onChange={(e) => setForm((f) => ({ ...f, dataVencimento: e.target.value }))}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Total de parcelas</label>
          <input
            type="number"
            min={1}
            max={120}
            value={form.totalParcelas}
            onChange={(e) => setForm((f) => ({ ...f, totalParcelas: e.target.value }))}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Isso cria todas as parcelas de uma vez, uma por mês.</p>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onFechar} disabled={salvando}>Cancelar</Button>
        <Button size="sm" onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Criar parcelas
        </Button>
      </div>
    </ModalBase>
  );
}

function ModalEditarConta({
  conta,
  empresas,
  categorias,
  onFechar,
}: {
  conta: ContaPagarItem;
  empresas: OpcaoSimples[];
  categorias: OpcaoSimples[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [descricao, setDescricao] = React.useState(conta.descricao);
  const [valor, setValor] = React.useState(String(conta.valor));
  const [dataVencimento, setDataVencimento] = React.useState(conta.dataVencimento.slice(0, 10));

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const r = await editarContaPagar(conta.id, {
        descricao,
        valor: Number(valor.replace(",", ".")),
        dataVencimento,
      });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      onFechar();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalBase titulo="Editar conta" onFechar={onFechar}>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Descrição</label>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Vencimento</label>
          <input
            type="date"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      {conta.tipo === "PARCELADA" && (
        <p className="text-xs text-muted-foreground">
          Isso edita só esta parcela ({conta.parcelaAtual}/{conta.parcelaTotal}) — as outras continuam como estão.
        </p>
      )}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onFechar} disabled={salvando}>Cancelar</Button>
        <Button size="sm" onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </ModalBase>
  );
}

function CamposComuns({
  empresas,
  categorias,
  form,
  setForm,
  labelValor = "Valor (R$)",
}: {
  empresas: OpcaoSimples[];
  categorias: OpcaoSimples[];
  form: { empresaId: string; categoriaId: string; descricao: string; valor: string; observacoes: string };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  labelValor?: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Empresa</label>
          <select
            value={form.empresaId}
            onChange={(e) => setForm((f: any) => ({ ...f, empresaId: e.target.value }))}
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
            onChange={(e) => setForm((f: any) => ({ ...f, categoriaId: e.target.value }))}
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
          onChange={(e) => setForm((f: any) => ({ ...f, descricao: e.target.value }))}
          placeholder="Ex: Manutenção do ar-condicionado"
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">{labelValor}</label>
        <input
          value={form.valor}
          onChange={(e) => setForm((f: any) => ({ ...f, valor: e.target.value }))}
          placeholder="0,00"
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        />
      </div>
    </>
  );
}

function ModalBase({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFechar}>
      <div
        className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
          <button onClick={onFechar} className="rounded p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
