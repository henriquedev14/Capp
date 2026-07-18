"use client";

import * as React from "react";
import { Check, Loader2, Scissors, Cable, Grid3x3, Link2, PackageCheck, Plus, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  registrarProducao,
  listarRegistrosHojeDaBancada,
  listarTipologiasDoEmpreendimento,
  listarPecasComProgresso,
  criarOperador,
} from "@/features/producao/actions/producao-actions";
import { verificarDisponibilidadeParaProducao } from "@/features/suprimentos/actions/suprimentos-actions";
import { calcularQuantidadeUH, calcularPercentualMeta, type Bancada, type OperadorProducao } from "@/core/producao/entities/producao";

type Turno = "MANHA" | "TARDE" | "NOITE";

function turnoAtualPadrao(): Turno {
  const hora = new Date().getHours();
  if (hora < 12) return "MANHA";
  if (hora < 18) return "TARDE";
  return "NOITE";
}

interface Props {
  bancadas: Bancada[];
  operadores: OperadorProducao[];
  empreendimentos: { id: string; nome: string }[];
  metaDiariaUH: number;
}

interface RegistroHoje {
  id: string;
  operadorNome: string;
  empreendimentoNome: string;
  tipologiaNome: string;
  pecaLabel: string;
  unidadesConcluidas: number;
  turno: Turno;
  quantidade: number;
  corrigido: boolean;
  createdAt: Date;
}

interface Tipologia {
  id: string;
  nome: string;
  statusProducao: "ATIVA" | "STANDBY" | "CONCLUIDA";
}

interface Peca {
  id: string;
  numero: number;
  trecho: string;
  local: string | null;
  metrosCabo: number;
  metrosEletroduto: number;
  concluidas: number;
  total: number;
  completa: boolean;
}

const ICONE_BANCADA: Record<string, React.ComponentType<{ className?: string }>> = {
  "Corte de Fio": Scissors,
  "Corte de Eletroduto": Cable,
  "Kit Polvo": Grid3x3,
  Fechamento: Link2,
  Finalização: PackageCheck,
};

function formatNum(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * Alerta em tempo real de ritmo — gap identificado: o dashboard só
 * mostrava resultado no fim do dia, sem avisar durante o expediente que
 * alguém está muito atrás. Assume expediente 7h-17h (10h); espera que a
 * pessoa esteja com pelo menos metade do ritmo proporcional ao horário
 * atual. Simples de propósito — não tenta ser preciso, só sinalizar.
 */
function ritmoPreocupante(percentualMeta: number): boolean {
  const hora = new Date().getHours() + new Date().getMinutes() / 60;
  const fracaoDoDia = Math.min(Math.max((hora - 7) / 10, 0), 1);
  if (fracaoDoDia < 0.3) return false; // início do expediente, não faz sentido alertar ainda
  return percentualMeta < fracaoDoDia * 0.5;
}

export function TabletProducaoView({ bancadas, operadores: operadoresIniciais, empreendimentos, metaDiariaUH }: Props) {
  const [bancadaId, setBancadaId] = React.useState<string | null>(null);
  const [empreendimentoId, setEmpreendimentoId] = React.useState<string>("");
  const [tipologiaId, setTipologiaId] = React.useState<string>("");
  const [pecaId, setPecaId] = React.useState<string>("");
  const [operadorId, setOperadorId] = React.useState<string>("");
  const [unidadesConcluidas, setUnidadesConcluidas] = React.useState<string>("");
  const [turno, setTurno] = React.useState<Turno>(turnoAtualPadrao());
  const [registrando, setRegistrando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const [alertaMaterial, setAlertaMaterial] = React.useState<string | null>(null);
  const [verificandoMaterial, setVerificandoMaterial] = React.useState(false);

  const [operadores, setOperadores] = React.useState(operadoresIniciais);
  const [novoOperadorNome, setNovoOperadorNome] = React.useState("");
  const [criandoOperador, setCriandoOperador] = React.useState(false);

  const [tipologias, setTipologias] = React.useState<Tipologia[]>([]);
  const [carregandoTipologias, setCarregandoTipologias] = React.useState(false);
  const [pecas, setPecas] = React.useState<Peca[]>([]);
  const [carregandoPecas, setCarregandoPecas] = React.useState(false);

  const [registrosHoje, setRegistrosHoje] = React.useState<RegistroHoje[]>([]);
  const [carregandoHoje, setCarregandoHoje] = React.useState(false);

  const bancadaAtiva = bancadas.find((b) => b.id === bancadaId) ?? null;
  const pecaAtiva = pecas.find((p) => p.id === pecaId) ?? null;
  const tipologiaAtiva = tipologias.find((t) => t.id === tipologiaId) ?? null;

  const carregarHoje = React.useCallback(async (id: string) => {
    setCarregandoHoje(true);
    try {
      const dados = await listarRegistrosHojeDaBancada(id);
      setRegistrosHoje(dados);
    } finally {
      setCarregandoHoje(false);
    }
  }, []);

  React.useEffect(() => {
    if (bancadaId) carregarHoje(bancadaId);
  }, [bancadaId, carregarHoje]);

  // Ao trocar de obra, recarrega as tipologias dela e reseta o que vinha
  // depois na cadeia (tipologia, peça).
  React.useEffect(() => {
    setTipologiaId("");
    setPecaId("");
    setPecas([]);
    if (!empreendimentoId) {
      setTipologias([]);
      return;
    }
    setCarregandoTipologias(true);
    listarTipologiasDoEmpreendimento(empreendimentoId)
      .then(setTipologias)
      .finally(() => setCarregandoTipologias(false));
  }, [empreendimentoId]);

  // Ao trocar de tipologia (ou bancada), recarrega as peças já com o
  // progresso calculado NESSA bancada específica — "faltam X de Y" é
  // por combinação peça+bancada, não só por peça.
  const carregarPecas = React.useCallback((bId: string, tId: string) => {
    setCarregandoPecas(true);
    return listarPecasComProgresso(bId, tId)
      .then(setPecas)
      .finally(() => setCarregandoPecas(false));
  }, []);

  React.useEffect(() => {
    setPecaId("");
    if (!tipologiaId || !bancadaId) {
      setPecas([]);
      return;
    }
    carregarPecas(bancadaId, tipologiaId);
  }, [tipologiaId, bancadaId, carregarPecas]);

  // Alerta em tempo real: se a obra/tipologia escolhida não tem material
  // suficiente, avisa ANTES do operador perder tempo produzindo algo que
  // vai empacar depois (gap identificado: "não adianta continuar
  // produzindo sem material").
  React.useEffect(() => {
    if (!empreendimentoId || !tipologiaId) {
      setAlertaMaterial(null);
      return;
    }
    setVerificandoMaterial(true);
    verificarDisponibilidadeParaProducao(empreendimentoId, tipologiaId)
      .then((r) => {
        if ("erro" in r) {
          setAlertaMaterial(null); // sem levantamento ainda não é bloqueio de MATERIAL, é outra etapa
          return;
        }
        if (!r.podeIniciar) {
          const faltando = r.itens.filter((i) => i.suficiente === false);
          setAlertaMaterial(
            `Material insuficiente pra essa tipologia: ${faltando.map((i) => i.descricao).join(", ")}. Pode continuar registrando, mas vale confirmar com Suprimentos antes de seguir muito.`
          );
        } else {
          setAlertaMaterial(null);
        }
      })
      .finally(() => setVerificandoMaterial(false));
  }, [empreendimentoId, tipologiaId]);

  async function handleCriarOperador() {
    if (!novoOperadorNome.trim()) return;
    setCriandoOperador(true);
    try {
      const r = await criarOperador(novoOperadorNome.trim());
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setOperadores((prev) => [...prev, { id: r.id, nome: novoOperadorNome.trim(), ativo: true, createdAt: new Date(), updatedAt: new Date() }]);
      setOperadorId(r.id);
      setNovoOperadorNome("");
    } finally {
      setCriandoOperador(false);
    }
  }

  async function handleRegistrar() {
    setErro(null);
    if (!bancadaId) return;
    if (!operadorId) {
      setErro("Escolha o operador.");
      return;
    }
    if (!empreendimentoId) {
      setErro("Escolha a obra.");
      return;
    }
    if (!tipologiaId) {
      setErro("Escolha a tipologia.");
      return;
    }
    if (!pecaId) {
      setErro("Escolha a peça.");
      return;
    }
    const unidadesNum = Number(unidadesConcluidas.replace(",", "."));
    if (!unidadesNum || unidadesNum <= 0) {
      setErro("Digite quantas unidades foram concluídas.");
      return;
    }

    setRegistrando(true);
    try {
      const r = await registrarProducao({
        bancadaId,
        operadorId,
        empreendimentoId,
        tipologiaId,
        pecaId,
        unidadesConcluidas: unidadesNum,
        turno,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setUnidadesConcluidas("");
      await Promise.all([carregarHoje(bancadaId), carregarPecas(bancadaId, tipologiaId)]);
    } finally {
      setRegistrando(false);
    }
  }

  const totaisPorOperador = React.useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of registrosHoje) {
      mapa.set(r.operadorNome, (mapa.get(r.operadorNome) ?? 0) + r.quantidade);
    }
    return Array.from(mapa.entries()).map(([nome, total]) => {
      const uh = bancadaAtiva ? calcularQuantidadeUH(total, bancadaAtiva.uhReferencia) : 0;
      const pct = calcularPercentualMeta(uh, metaDiariaUH);
      return { nome, total, uh, pct };
    });
  }, [registrosHoje, bancadaAtiva, metaDiariaUH]);

  // --- Etapa 1: escolher a bancada ---
  if (!bancadaAtiva) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {bancadas.map((b) => {
          const Icone = ICONE_BANCADA[b.nome] ?? Scissors;
          return (
            <button
              key={b.id}
              onClick={() => setBancadaId(b.id)}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-card-md active:scale-[0.98]"
            >
              <Icone className="h-10 w-10 text-primary" />
              <span className="text-base font-semibold text-foreground">{b.nome}</span>
              <span className="text-xs text-muted-foreground">
                {b.unidadeMedida === "METROS" ? "metros" : "peças"}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setBancadaId(null)}>
          ← Trocar de bancada
        </Button>
        <span className="text-lg font-semibold text-foreground">{bancadaAtiva.nome}</span>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Produzindo para a obra:</label>
            <select
              value={empreendimentoId}
              onChange={(e) => setEmpreendimentoId(e.target.value)}
              className="h-12 rounded-lg border border-input bg-background px-3 text-base"
            >
              <option value="">Selecione a obra</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          {empreendimentoId && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Tipologia:</label>
              <select
                value={tipologiaId}
                onChange={(e) => setTipologiaId(e.target.value)}
                disabled={carregandoTipologias}
                className="h-12 rounded-lg border border-input bg-background px-3 text-base"
              >
                <option value="">{carregandoTipologias ? "Carregando..." : "Selecione a tipologia"}</option>
                {tipologias.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipologiaId && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Peça:</label>
              <select
                value={pecaId}
                onChange={(e) => setPecaId(e.target.value)}
                disabled={carregandoPecas}
                className="h-12 rounded-lg border border-input bg-background px-3 text-base"
              >
                <option value="">
                  {carregandoPecas
                    ? "Carregando..."
                    : pecas.length === 0
                      ? "Nenhuma peça — valide o Levantamento Elétrico primeiro"
                      : "Selecione a peça"}
                </option>
                {pecas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.completa ? "✓ " : ""}Peça {p.numero} — {p.trecho}
                    {p.local ? ` (${p.local})` : ""} — {p.concluidas}/{p.total}
                  </option>
                ))}
              </select>
              {pecaAtiva && (
                <p className={`text-xs ${pecaAtiva.completa ? "font-medium text-success" : "text-muted-foreground"}`}>
                  {pecaAtiva.completa
                    ? `Essa peça já está completa (${pecaAtiva.concluidas}/${pecaAtiva.total}) — confirma antes de continuar registrando aqui.`
                    : `Faltam ${pecaAtiva.total - pecaAtiva.concluidas} de ${pecaAtiva.total} unidades nessa bancada.`}
                  {" · "}
                  {bancadaAtiva.tipoCalculo === "CABO" && `${formatNum(pecaAtiva.metrosCabo)}m de cabo por unidade`}
                  {bancadaAtiva.tipoCalculo === "ELETRODUTO" &&
                    `${formatNum(pecaAtiva.metrosEletroduto)}m de eletroduto por unidade`}
                  {bancadaAtiva.tipoCalculo === "CONTAGEM" && "1 peça por unidade"}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Turno:</label>
            <div className="flex gap-2">
              {(["MANHA", "TARDE", "NOITE"] as Turno[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTurno(t)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    turno === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                  }`}
                >
                  {t === "MANHA" ? "Manhã" : t === "TARDE" ? "Tarde" : "Noite"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Operador:</label>
            <div className="flex flex-wrap gap-2">
              {operadores.map((op) => (
                <button
                  key={op.id}
                  onClick={() => setOperadorId(op.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    operadorId === op.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                  }`}
                >
                  {op.nome}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={novoOperadorNome}
                onChange={(e) => setNovoOperadorNome(e.target.value)}
                placeholder="Novo operador..."
                className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleCriarOperador} disabled={criandoOperador}>
                {criandoOperador ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Quantas unidades da tipologia você concluiu nessa peça hoje?
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={unidadesConcluidas}
              onChange={(e) => setUnidadesConcluidas(e.target.value)}
              placeholder="0"
              className="h-14 rounded-lg border border-input bg-background px-4 text-2xl font-semibold tabular-nums"
            />
          </div>

          {tipologiaAtiva?.statusProducao === "STANDBY" && (
            <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Essa tipologia está em STAND-BY (pausada intencionalmente pela gestão) — confirme antes de continuar
              produzindo pra ela.
            </p>
          )}

          {alertaMaterial && !verificandoMaterial && (
            <p className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm font-medium text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {alertaMaterial}
            </p>
          )}

          {erro && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>
          )}

          <Button size="lg" className="h-14 text-base" onClick={handleRegistrar} disabled={registrando}>
            {registrando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Registrar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Hoje nesta bancada</h3>
          {carregandoHoje ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : registrosHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda hoje.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-1.5">
                {registrosHoje.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary/30 px-3 py-1.5 text-xs">
                    <span className="text-foreground">
                      {r.operadorNome} — {r.empreendimentoNome} / {r.tipologiaNome} / {r.pecaLabel} ×{r.unidadesConcluidas}
                      {r.corrigido && <span className="ml-1 text-warning">(corrigido)</span>}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                      {formatNum(r.quantidade)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                {totaisPorOperador.map((t) => {
                  const preocupante = ritmoPreocupante(t.pct);
                  return (
                    <div key={t.nome} className="flex items-center gap-3">
                      <span className="flex w-32 shrink-0 items-center gap-1 truncate text-sm text-foreground">
                        {preocupante && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />}
                        {t.nome}
                      </span>
                      <div className="relative h-6 flex-1 rounded bg-secondary/60">
                        <div
                          className={`absolute inset-y-0 left-0 rounded transition-all ${
                            t.pct >= 1 ? "bg-success" : preocupante ? "bg-warning" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(t.pct * 100, 100)}%`, minWidth: "4px" }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {formatNum(t.total)} · {formatNum(t.uh)} U.H.
                      </span>
                      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                        {(t.pct * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
