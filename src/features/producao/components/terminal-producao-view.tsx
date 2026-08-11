"use client";

import * as React from "react";
import {
  listarOrdensDaBancada,
  iniciarOuRetomarOrdem,
  pausarOrdem,
  incrementarContadorOrdem,
  finalizarOrdem,
  type OrdemProducaoView,
} from "@/features/producao/actions/ordem-producao-actions";
import type { Bancada, OperadorProducao } from "@/core/producao/entities/producao";

const CHAVE_LOCALSTORAGE = "capp_terminal_bancada_id";

const MOTIVOS_PAUSA = ["Falta de material", "Manutenção", "Aguardando", "Setup / troca", "Intervalo", "Outro"];

function formatarTempo(segundos: number): string {
  const h = String(Math.floor(segundos / 3600)).padStart(2, "0");
  const m = String(Math.floor((segundos % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(segundos % 60)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const COR_PRIORIDADE: Record<string, string> = {
  ALTA: "#CC3C3C",
  MEDIA: "#C27B00",
  BAIXA: "#23814B",
};
const BG_PRIORIDADE: Record<string, string> = {
  ALTA: "#FDE7E7",
  MEDIA: "#FFF0D3",
  BAIXA: "#E7F6ED",
};
const LABEL_PRIORIDADE: Record<string, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" };

interface Props {
  bancadas: Bancada[];
  operadores: OperadorProducao[];
}

export function TerminalProducaoView({ bancadas, operadores }: Props) {
  const [bancadaId, setBancadaId] = React.useState<string | null>(null);
  const [carregandoPareamento, setCarregandoPareamento] = React.useState(true);

  React.useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (salvo && bancadas.some((b) => b.id === salvo)) setBancadaId(salvo);
    setCarregandoPareamento(false);
  }, [bancadas]);

  function parear(id: string) {
    window.localStorage.setItem(CHAVE_LOCALSTORAGE, id);
    setBancadaId(id);
  }

  function trocarBancada() {
    window.localStorage.removeItem(CHAVE_LOCALSTORAGE);
    setBancadaId(null);
  }

  if (carregandoPareamento) return null;

  if (!bancadaId) {
    return <TelaPareamento bancadas={bancadas} onEscolher={parear} />;
  }

  const bancada = bancadas.find((b) => b.id === bancadaId);
  if (!bancada) return <TelaPareamento bancadas={bancadas} onEscolher={parear} />;

  return <TelaOperacao bancada={bancada} operadores={operadores} onTrocarBancada={trocarBancada} />;
}

function TelaPareamento({ bancadas, onEscolher }: { bancadas: Bancada[]; onEscolher: (id: string) => void }) {
  return (
    <div style={{ maxWidth: 480, margin: "60px auto", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Configurar este tablet</h1>
      <p style={{ fontSize: 13, color: "#86847E", marginBottom: 20 }}>
        Qual bancada esse aparelho vai representar? Isso só é perguntado uma vez — fica salvo nesse tablet.
      </p>
      {bancadas
        .filter((b) => b.ativo)
        .sort((a, b) => a.ordem - b.ordem)
        .map((b) => (
          <button
            key={b.id}
            onClick={() => onEscolher(b.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: 16,
              border: "2px solid #EAE9E5",
              borderRadius: 12,
              marginBottom: 10,
              fontWeight: 600,
              fontSize: 15,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {b.nome}
          </button>
        ))}
    </div>
  );
}

function TelaOperacao({
  bancada,
  operadores,
  onTrocarBancada,
}: {
  bancada: Bancada;
  operadores: OperadorProducao[];
  onTrocarBancada: () => void;
}) {
  const [operadorId, setOperadorId] = React.useState<string | null>(null);
  const [ordens, setOrdens] = React.useState<OrdemProducaoView[]>([]);
  const [ordemSelecionadaId, setOrdemSelecionadaId] = React.useState<string | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [segundosSessao, setSegundosSessao] = React.useState(0);
  const [modalPausaAberto, setModalPausaAberto] = React.useState(false);
  const [relogio, setRelogio] = React.useState("");

  React.useEffect(() => {
    const tick = () => setRelogio(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const carregarOrdens = React.useCallback(async () => {
    setCarregando(true);
    const r = await listarOrdensDaBancada(bancada.id);
    setOrdens(r);
    setCarregando(false);
  }, [bancada.id]);

  React.useEffect(() => {
    carregarOrdens();
  }, [carregarOrdens]);

  const ordemSelecionada = ordens.find((o) => o.id === ordemSelecionadaId) ?? ordens[0] ?? null;

  // Cronômetro visual — soma o tempo já salvo na OP com o tempo rodado
  // nessa sessão do navegador (só é gravado no banco quando pausa ou
  // finaliza, pra não bater no banco a cada segundo).
  React.useEffect(() => {
    if (!ordemSelecionada || ordemSelecionada.status !== "EM_ANDAMENTO") return;
    const id = setInterval(() => setSegundosSessao((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [ordemSelecionada?.id, ordemSelecionada?.status]);

  React.useEffect(() => {
    setSegundosSessao(0);
  }, [ordemSelecionada?.id]);

  if (!operadorId) {
    return (
      <TelaOperador
        bancadaNome={bancada.nome}
        relogio={relogio}
        operadores={operadores.filter((o) => o.ativo)}
        onEscolher={setOperadorId}
        onTrocarBancada={onTrocarBancada}
      />
    );
  }

  const operador = operadores.find((o) => o.id === operadorId);

  async function handleIniciar(ordemId: string) {
    setOrdemSelecionadaId(ordemId);
    await iniciarOuRetomarOrdem(ordemId, operadorId!);
    await carregarOrdens();
  }

  async function handleIncrementar(tipo: "APROVADO" | "RETRABALHO" | "PERDA", quantidade: number) {
    if (!ordemSelecionada) return;
    // Otimista — atualiza a tela na hora, sem esperar o servidor.
    setOrdens((prev) =>
      prev.map((o) =>
        o.id === ordemSelecionada.id
          ? {
              ...o,
              quantidadeAprovada: tipo === "APROVADO" ? Math.max(0, o.quantidadeAprovada + quantidade) : o.quantidadeAprovada,
              quantidadeRetrabalho: tipo === "RETRABALHO" ? Math.max(0, o.quantidadeRetrabalho + quantidade) : o.quantidadeRetrabalho,
              quantidadePerda: tipo === "PERDA" ? Math.max(0, o.quantidadePerda + quantidade) : o.quantidadePerda,
            }
          : o
      )
    );
    await incrementarContadorOrdem(ordemSelecionada.id, tipo, quantidade);
  }

  async function handlePausar(motivo: string) {
    if (!ordemSelecionada) return;
    await pausarOrdem(ordemSelecionada.id, motivo, segundosSessao);
    setModalPausaAberto(false);
    await carregarOrdens();
  }

  async function handleFinalizar() {
    if (!ordemSelecionada) return;
    const r = await finalizarOrdem(ordemSelecionada.id, segundosSessao);
    if ("incompleta" in r && r.incompleta) {
      if (window.confirm(r.erro)) {
        await finalizarOrdem(ordemSelecionada.id, segundosSessao, true);
      } else {
        return;
      }
    }
    setOrdemSelecionadaId(null);
    await carregarOrdens();
  }

  const tempoTotalExibido = (ordemSelecionada?.tempoTotalSegundos ?? 0) + segundosSessao;
  const horasDecorridas = Math.max(tempoTotalExibido / 3600, 0.01);
  const ritmoAtual = ordemSelecionada ? ordemSelecionada.quantidadeAprovada / horasDecorridas : 0;
  const faltam = ordemSelecionada ? Math.max(0, ordemSelecionada.quantidadeAlvo - ordemSelecionada.quantidadeAprovada) : 0;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F4F6F8", minHeight: "100vh", padding: 20 }}>
      {/* Topbar */}
      <div
        style={{
          background: "linear-gradient(90deg,#17202A,#232D38)",
          color: "#fff",
          borderRadius: 16,
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 800, fontSize: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F57C20", display: "flex", alignItems: "center", justifyContent: "center" }}>
            H
          </div>
          HGI <span style={{ fontSize: 13, fontWeight: 600, color: "#C9D1D9" }}>| {bancada.nome}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.06)", padding: "8px 12px", borderRadius: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#D9DEE4", display: "flex", alignItems: "center", justifyContent: "center", color: "#44515F", fontWeight: 700, fontSize: 12 }}>
            {operador?.nome?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <b style={{ display: "block", fontSize: 13 }}>{operador?.nome}</b>
            <button onClick={() => setOperadorId(null)} style={{ fontSize: 11, color: "#B8C1CB", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Trocar operador
            </button>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <strong style={{ fontSize: 22, display: "block" }}>{relogio}</strong>
          <button onClick={onTrocarBancada} style={{ fontSize: 11, color: "#B8C1CB", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Configurar bancada
          </button>
        </div>
      </div>

      {carregando ? (
        <p style={{ color: "#86847E" }}>Carregando ordens...</p>
      ) : ordens.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 30, textAlign: "center", color: "#86847E" }}>
          Nenhuma ordem de produção liberada pra essa bancada agora.
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>1. Selecione o que vai produzir</h2>
          <p style={{ fontSize: 13, color: "#86847E", marginBottom: 14 }}>{ordens.length} ordem(ns) disponível(is)</p>

          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, marginBottom: 18 }}>
            {ordens.map((o) => {
              const selecionada = ordemSelecionada?.id === o.id;
              return (
                <div
                  key={o.id}
                  onClick={() => setOrdemSelecionadaId(o.id)}
                  style={{
                    minWidth: 220,
                    background: selecionada ? "#FFFDFC" : "#fff",
                    border: selecionada ? "2px solid #F57C20" : "1px solid #E3E8ED",
                    borderRadius: 14,
                    padding: 16,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, color: selecionada ? "#F57C20" : "#293A5A" }}>{o.numero}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: BG_PRIORIDADE[o.prioridade],
                        color: COR_PRIORIDADE[o.prioridade],
                      }}
                    >
                      {LABEL_PRIORIDADE[o.prioridade]}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>{o.tipologiaNome}</h3>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#34445D" }}>{o.empreendimentoNome}</div>
                  <div style={{ marginTop: 12, fontSize: 12, color: "#58687D" }}>
                    {o.quantidadeAprovada}/{o.quantidadeAlvo} feitos
                    {o.status === "EM_ANDAMENTO" && <span style={{ color: "#F57C20", fontWeight: 700 }}> · em andamento</span>}
                    {o.status === "PAUSADA" && <span style={{ color: "#D99100", fontWeight: 700 }}> · pausada</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {ordemSelecionada && (
            <>
              <div style={{ background: "#fff", border: "1px solid #E3E8ED", borderRadius: 14, padding: "18px 20px", marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: "#F57C20", fontSize: 12, fontWeight: 800 }}>ORDEM SELECIONADA</div>
                  <h3 style={{ fontSize: 24, margin: "4px 0" }}>{ordemSelecionada.numero}</h3>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {ordemSelecionada.tipologiaNome} — {ordemSelecionada.empreendimentoNome}
                  </p>
                </div>
                <div>
                  <span style={{ color: "#69788C", fontSize: 12, display: "block" }}>Quantidade</span>
                  <strong style={{ fontSize: 22 }}>{ordemSelecionada.quantidadeAlvo}</strong> <small>kits</small>
                </div>
                <div>
                  <span style={{ color: "#69788C", fontSize: 12, display: "block" }}>Meta / hora</span>
                  <strong style={{ fontSize: 22 }}>{ordemSelecionada.metaPorHora}</strong> <small>kits/h</small>
                </div>
                <div>
                  <span style={{ color: "#69788C", fontSize: 12, display: "block" }}>Prazo</span>
                  <strong style={{ fontSize: 16 }}>{ordemSelecionada.prazo ?? "Sem data"}</strong>
                </div>
              </div>

              {ordemSelecionada.status !== "EM_ANDAMENTO" ? (
                <button
                  onClick={() => handleIniciar(ordemSelecionada.id)}
                  style={{ width: "100%", background: "#F57C20", color: "#fff", border: "none", borderRadius: 12, padding: 18, fontSize: 16, fontWeight: 700, marginBottom: 18 }}
                >
                  {ordemSelecionada.status === "PAUSADA" ? "Retomar produção" : "Iniciar produção"}
                </button>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
                  <div style={{ background: "#fff", border: "1px solid #E3E8ED", borderRadius: 14, padding: 20 }}>
                    <div style={{ color: "#187B47", fontWeight: 800, fontSize: 18, marginBottom: 18 }}>2. PRODUÇÃO EM ANDAMENTO</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "end", marginBottom: 24 }}>
                      <div>
                        <div style={{ color: "#405066", fontSize: 13 }}>Tempo de produção</div>
                        <div style={{ fontSize: 48, color: "#238B4B", fontWeight: 800 }}>{formatarTempo(tempoTotalExibido)}</div>
                      </div>
                      <div>
                        <div style={{ color: "#405066", fontSize: 13 }}>Aprovados</div>
                        <div style={{ fontSize: 60, color: "#238B4B", fontWeight: 800, lineHeight: 1 }}>
                          {ordemSelecionada.quantidadeAprovada}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                      <ContadorBotao label="−1" onClick={() => handleIncrementar("APROVADO", -1)} />
                      <ContadorBotao label="+1 kit" destaque onClick={() => handleIncrementar("APROVADO", 1)} />
                      <ContadorBotao label="+5 kits" destaque onClick={() => handleIncrementar("APROVADO", 5)} />
                      <ContadorBotao label="+10 kits" destaque onClick={() => handleIncrementar("APROVADO", 10)} />
                    </div>
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #E3E8ED", borderRadius: 14, padding: 20 }}>
                    <h3 style={{ fontSize: 16, margin: "0 0 16px", color: "#30415D" }}>RESUMO</h3>
                    <LinhaResumo cor="#1F9D55" bg="#EAF7EF" icone="✓" label="Aprovados" valor={ordemSelecionada.quantidadeAprovada} />
                    <LinhaResumo cor="#D99100" bg="#FFF5DE" icone="↻" label="Retrabalho" valor={ordemSelecionada.quantidadeRetrabalho} onClick={() => handleIncrementar("RETRABALHO", 1)} />
                    <LinhaResumo cor="#E34D4D" bg="#FDECEC" icone="×" label="Perdas" valor={ordemSelecionada.quantidadePerda} onClick={() => handleIncrementar("PERDA", 1)} />
                    <LinhaResumo cor="#2F6FE4" bg="#EBF2FF" icone="↗" label="Ritmo atual" valor={`${ritmoAtual.toFixed(1)} kits/h`} />
                    <LinhaResumo cor="#2F6FE4" bg="#EBF2FF" icone="□" label="Faltam" valor={`${faltam} kits`} />
                  </div>
                </div>
              )}

              {ordemSelecionada.status === "EM_ANDAMENTO" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
                  <button
                    onClick={() => setModalPausaAberto(true)}
                    style={{ minHeight: 70, borderRadius: 12, background: "#fff", border: "1.5px solid #F3B158", color: "#D38400", fontWeight: 800, fontSize: 15 }}
                  >
                    Ⅱ Pausar
                  </button>
                  <button
                    onClick={handleFinalizar}
                    style={{ minHeight: 70, borderRadius: 12, background: "linear-gradient(180deg,#24974E,#177B3D)", color: "#fff", border: "none", fontWeight: 800, fontSize: 15 }}
                  >
                    ✓ Finalizar
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {modalPausaAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,16,24,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 99 }}>
          <div style={{ width: "min(480px,95vw)", background: "#fff", borderRadius: 18, padding: 22 }}>
            <h3 style={{ marginTop: 0 }}>Motivo da pausa</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {MOTIVOS_PAUSA.map((m) => (
                <button
                  key={m}
                  onClick={() => handlePausar(m)}
                  style={{ padding: 16, borderRadius: 12, border: "1px solid #E3E8ED", background: "#fff", fontWeight: 700, cursor: "pointer" }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button onClick={() => setModalPausaAberto(false)} style={{ background: "#fff", border: "1px solid #E3E8ED", padding: "11px 16px", borderRadius: 10 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TelaOperador({
  bancadaNome,
  relogio,
  operadores,
  onEscolher,
  onTrocarBancada,
}: {
  bancadaNome: string;
  relogio: string;
  operadores: OperadorProducao[];
  onEscolher: (id: string) => void;
  onTrocarBancada: () => void;
}) {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F4F6F8", minHeight: "100vh", padding: 20 }}>
      <div
        style={{
          background: "linear-gradient(90deg,#17202A,#232D38)",
          color: "#fff",
          borderRadius: 16,
          padding: "16px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18 }}>HGI | {bancadaNome}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <strong>{relogio}</strong>
          <button onClick={onTrocarBancada} style={{ fontSize: 12, color: "#B8C1CB", background: "none", border: "none", cursor: "pointer" }}>
            Configurar
          </button>
        </div>
      </div>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Quem é você?</h2>
      <p style={{ fontSize: 13, color: "#86847E", marginBottom: 18 }}>Toque no seu nome pra começar</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {operadores.map((op) => (
          <button
            key={op.id}
            onClick={() => onEscolher(op.id)}
            style={{
              background: "#fff",
              border: "2px solid #E3E8ED",
              borderRadius: 14,
              padding: "20px 12px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#FFF0E6",
                color: "#F57C20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 16,
                margin: "0 auto 8px",
              }}
            >
              {op.nome.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{op.nome}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ContadorBotao({ label, destaque, onClick }: { label: string; destaque?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1.6px solid ${destaque ? "#8ED0A8" : "#B7C2CD"}`,
        borderRadius: 12,
        padding: "18px 8px",
        cursor: "pointer",
        fontWeight: 800,
        fontSize: 20,
        color: destaque ? "#249050" : "#334155",
      }}
    >
      {label}
    </button>
  );
}

function LinhaResumo({
  cor,
  bg,
  icone,
  label,
  valor,
  onClick,
}: {
  cor: string;
  bg: string;
  icone: string;
  label: string;
  valor: string | number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 0",
        borderBottom: "1px solid #EEF1F4",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: bg, color: cor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>
          {icone}
        </span>
        <span>{label}</span>
        {onClick && <span style={{ fontSize: 10, color: "#B4B2AB" }}>(toque +1)</span>}
      </div>
      <strong>{valor}</strong>
    </div>
  );
}
