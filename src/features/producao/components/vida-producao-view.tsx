import type { VidaProducaoV2 } from "@/features/producao/queries/vida-producao-v2";

const COR = {
  bg: "#f5f5f3",
  card: "#ffffff",
  border: "#eae8e2",
  borderSoft: "#f2f0ea",
  text: "#191815",
  text2: "#4a4945",
  muted: "#8a8883",
  primary: "#ea580c",
  primaryDark: "#c2410c",
  primarySoft: "#fff3ea",
  success: "#059669",
  successSoft: "#ecfaf3",
  warning: "#d97706",
  warningSoft: "#fef7e9",
  danger: "#dc2626",
  dangerSoft: "#fef0ef",
  idle: "#9a988f",
  idleSoft: "#f4f3f0",
};

const STATUS_BADGE: Record<string, { bg: string; cor: string; texto: string }> = {
  concluido: { bg: COR.successSoft, cor: COR.success, texto: "Finalizado" },
  producao: { bg: COR.primarySoft, cor: COR.primary, texto: "Em Produção" },
  aguardando: { bg: COR.idleSoft, cor: COR.idle, texto: "Aguardando" },
  parado: { bg: COR.dangerSoft, cor: COR.danger, texto: "Parado" },
};

/**
 * Vida da Produção — replica visual do producao-empreendimento-demo-v6.html
 * com dado real, na granularidade por Tipologia (não por kit
 * individual — decisão tomada com o Henrique em 11/08/2026). A
 * "Tendência" (evolução dia a dia) do demo original não está aqui —
 * o sistema não guarda snapshot diário de produção, só o total atual;
 * não quis inventar número.
 */
export function VidaProducaoView({ dados }: { dados: VidaProducaoV2 }) {
  const { cards } = dados;
  const raio = 32;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - dados.progressoGeralPct / 100);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: COR.text, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: COR.primarySoft, color: COR.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            🏗️
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{dados.empreendimentoNome}</h1>
            <div style={{ fontSize: 12.5, color: COR.muted, marginTop: 2 }}>
              {dados.clienteNome}
              {dados.cidadeEstado && ` · ${dados.cidadeEstado}`}
              {dados.responsavelNome && ` · ${dados.responsavelNome}`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10.5, color: COR.muted, fontWeight: 600, textTransform: "uppercase" }}>Previsão de Entrega</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{dados.previsaoEntrega ?? "Sem data"}</div>
          </div>
          <div style={{ position: "relative", width: 76, height: 76 }}>
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r={raio} fill="none" stroke={COR.borderSoft} strokeWidth="8" />
              <circle
                cx="38"
                cy="38"
                r={raio}
                fill="none"
                stroke={COR.primary}
                strokeWidth="8"
                strokeDasharray={circunferencia}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 38 38)"
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>
              {dados.progressoGeralPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <CardResumo label="Total de Kits" numero={cards.totalKits} cor={COR.text} />
        <CardResumo label="Concluídos" numero={cards.concluidos} cor={COR.success} />
        <CardResumo label="Em Produção" numero={cards.emProducao} cor={COR.primary} />
        <CardResumo label="Aguardando" numero={cards.aguardando} cor={COR.idle} />
        <CardResumo label="Parados" numero={cards.parados} cor={COR.danger} destaque={cards.parados > 0} />
      </div>

      {/* Layout principal: tabela + lateral */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <div style={{ background: COR.card, border: `1px solid ${COR.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Tipologias</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COR.border}` }}>
                {["Código", "Tipologia", "Status", "Progresso", "Início", "Previsão", "Responsável"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 6px", color: COR.muted, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.tabela.map((t) => {
                const badge = STATUS_BADGE[t.statusCategoria];
                return (
                  <tr key={t.codigo} style={{ borderBottom: `1px solid ${COR.borderSoft}` }}>
                    <td style={{ padding: "10px 6px", fontFamily: "monospace", fontWeight: 700 }}>{t.codigo}</td>
                    <td style={{ padding: "10px 6px" }}>{t.tipologiaNome}</td>
                    <td style={{ padding: "10px 6px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: badge.bg, color: badge.cor, padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: badge.cor }} />
                        {t.statusTexto}
                      </span>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: COR.borderSoft, overflow: "hidden" }}>
                          <div style={{ width: `${t.progressoPct}%`, height: "100%", background: badge.cor }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: COR.muted }}>{t.progressoPct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 6px", color: COR.muted, fontSize: 11.5 }}>{t.inicio ?? "—"}</td>
                    <td style={{ padding: "10px 6px", color: COR.muted, fontSize: 11.5 }}>{t.previsao ?? "—"}</td>
                    <td style={{ padding: "10px 6px", color: COR.muted, fontSize: 11.5 }}>{t.responsavelNome ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: COR.card, border: `1px solid ${COR.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Resumo Visual</div>
            <BarraH label="Concluídos" qtd={cards.concluidos} total={cards.totalKits} cor={COR.success} />
            <BarraH label="Em Produção" qtd={cards.emProducao} total={cards.totalKits} cor={COR.primary} />
            <BarraH label="Aguardando" qtd={cards.aguardando} total={cards.totalKits} cor={COR.idle} />
            <BarraH label="Parados" qtd={cards.parados} total={cards.totalKits} cor={COR.danger} />
          </div>

          <div style={{ background: COR.card, border: `1px solid ${COR.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Alertas</div>
            {dados.alertas.length === 0 ? (
              <p style={{ fontSize: 12.5, color: COR.muted, margin: 0 }}>Nenhum alerta agora.</p>
            ) : (
              dados.alertas.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < dados.alertas.length - 1 ? `1px solid ${COR.borderSoft}` : "none" }}>
                  <span style={{ color: a.severidade === "critico" ? COR.danger : COR.warning, fontSize: 14, flexShrink: 0 }}>
                    {a.severidade === "critico" ? "⚠" : "⏱"}
                  </span>
                  <div style={{ fontSize: 12 }}>
                    <b>{a.titulo}</b>
                    <div style={{ color: COR.muted, marginTop: 2 }}>{a.detalhe}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Velocímetro */}
      <div style={{ background: COR.card, border: `1px solid ${COR.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: COR.primary }}>
            ⚡ Velocidade de Produção
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: COR.success }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: COR.success }} />
            Tempo real
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 34, flexWrap: "wrap" }}>
          <VelocimetroSvg valor={dados.ritmoAtualPorHora} meta={dados.metaPorHora || dados.ritmoAtualPorHora || 1} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minWidth: 180 }}>
            <div>
              <div style={{ fontSize: 10.5, color: COR.muted, fontWeight: 600, textTransform: "uppercase" }}>Ritmo atual</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: COR.primary }}>{dados.ritmoAtualPorHora} kits/h</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: COR.muted, fontWeight: 600, textTransform: "uppercase" }}>Meta da bancada</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{dados.metaPorHora || "—"} kits/h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Torres comparativo */}
      {dados.torres.length > 0 && (
        <div style={{ background: COR.card, border: `1px solid ${COR.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Comparativo entre Torres</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {dados.torres.map((t) => (
              <div key={t.torreNome} style={{ border: `1px solid ${COR.border}`, borderRadius: 12, padding: 14, background: "#fbfaf8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{t.torreNome}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: COR.primary }}>{t.pct}%</span>
                </div>
                <div style={{ height: 26, background: COR.borderSoft, borderRadius: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${t.pct}%`,
                      background: COR.primary,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>
                      {t.concluidos}/{t.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CardResumo({ label, numero, cor, destaque }: { label: string; numero: number; cor: string; destaque?: boolean }) {
  return (
    <div
      style={{
        background: COR.card,
        border: `1px solid ${destaque ? COR.danger : COR.border}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 800, color: cor }}>{numero}</div>
      <div style={{ fontSize: 11.5, color: COR.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function BarraH({ label, qtd, total, cor }: { label: string; qtd: number; total: number; cor: string }) {
  const pct = total > 0 ? (qtd / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: cor }}>{qtd}</span>
      </div>
      <div style={{ height: 8, background: COR.borderSoft, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: cor, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function VelocimetroSvg({ valor, meta }: { valor: number; meta: number }) {
  const pct = Math.min(1, meta > 0 ? valor / meta : 0);
  const anguloMax = 180;
  const angulo = pct * anguloMax;
  const rad = ((180 - angulo) * Math.PI) / 180;
  const cx = 200;
  const cy = 190;
  const raioArco = 150;
  const pontaX = cx - raioArco * Math.cos(rad);
  const pontaY = cy - raioArco * Math.sin(rad);
  const largeArc = angulo > 180 ? 1 : 0;

  return (
    <svg width="240" height="150" viewBox="0 0 400 200" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={COR.primaryDark} />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <path d="M 50 190 A 150 150 0 0 1 350 190" fill="none" stroke={COR.borderSoft} strokeWidth="16" strokeLinecap="round" />
      <path
        d={`M 50 190 A 150 150 0 ${largeArc} 1 ${pontaX} ${pontaY}`}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="10" fill="#fff" stroke={COR.primary} strokeWidth="3" />
      <line x1={cx} y1={cy} x2={pontaX} y2={pontaY} stroke={COR.text} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
