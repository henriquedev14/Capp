import * as React from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, Circle, Text as SvgText } from "@react-pdf/renderer";

// PDF consolidado da Rodada de Cotação — reúne todos os fornecedores
// num documento só, fluindo numa página contínua (react-pdf quebra
// pra próxima folha sozinho conforme o conteúdo enche). Fase 2 do
// redesenho de Negociação (07/08/2026), visual elevado em 08/08/2026
// a pedido do Henrique (mesma identidade visual do PDF individual).

const NAVY = "#0B0F1A";
const ORANGE_HGI = "#FF731D";
const GRAY = "#6B7280";
const GRAY_LIGHT = "#E8E9EC";

function LogoMalha({ size = 30 }: { size?: number }) {
  // Mesmo símbolo do PDF individual, pra manter a identidade consistente.
  const pts: [number, number][] = [
    [8, 6],
    [24, 2],
    [38, 10],
    [30, 26],
    [14, 30],
    [4, 20],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 44 34">
      {pts.map(([x1, y1], i) =>
        pts.slice(i + 1).map(([x2, y2], j) => (
          <Line key={`${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={NAVY} strokeWidth={0.5} strokeOpacity={0.4} />
        ))
      )}
      {pts.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.8} fill={ORANGE_HGI} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: "#1A1A1A", padding: 26, paddingBottom: 46 },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: NAVY,
    marginBottom: 16,
  },
  headerLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  headerNome: { fontSize: 12, fontWeight: 700, color: NAVY, letterSpacing: 0.2 },
  headerMeta: { fontSize: 8, color: GRAY, marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  headerNumero: { fontSize: 12, fontWeight: 700, color: ORANGE_HGI },
  headerData: { fontSize: 7.5, color: GRAY, marginTop: 3 },

  secaoTitulo: {
    fontSize: 9.5,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  secaoSub: { fontSize: 7.5, color: GRAY, marginTop: -6, marginBottom: 10 },

  card: {
    borderWidth: 1,
    borderColor: GRAY_LIGHT,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  compTableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: GRAY_LIGHT, paddingBottom: 5 },
  compTh: { fontSize: 7, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3 },
  compThNome: { flex: 1, textAlign: "left" },
  compThTotal: { width: 90, textAlign: "right" },

  compRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: GRAY_LIGHT },
  compTd: { fontSize: 8.5 },
  compTdNome: { flex: 1, textAlign: "left", fontWeight: 700, color: NAVY },
  compTdTotal: { width: 90, textAlign: "right", fontWeight: 700, color: ORANGE_HGI },

  fornecedorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fornecedorBolinha: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE_HGI, marginRight: 6 },
  fornecedorNome: { fontSize: 10.5, fontWeight: 700, color: NAVY },

  fabricanteSubtitulo: {
    fontSize: 7.5,
    fontWeight: 700,
    color: ORANGE_HGI,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
    marginTop: 6,
  },

  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NAVY, paddingBottom: 4 },
  th: { fontSize: 6.8, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.2 },
  thDescricao: { flex: 1, textAlign: "left" },
  thUnd: { width: 30, textAlign: "center" },
  thQtde: { width: 44, textAlign: "right" },
  thVUnit: { width: 60, textAlign: "right" },
  thVTotal: { width: 62, textAlign: "right" },

  itemRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.4, borderBottomColor: GRAY_LIGHT },
  td: { fontSize: 7.5, color: "#333" },
  tdDescricao: { flex: 1, textAlign: "left" },
  tdUnd: { width: 30, textAlign: "center", textTransform: "uppercase", color: GRAY },
  tdQtde: { width: 44, textAlign: "right" },
  tdVUnit: { width: 60, textAlign: "right", color: GRAY },
  tdVTotal: { width: 62, textAlign: "right", fontWeight: 700, color: NAVY },

  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: NAVY,
  },
  totalLabel: { fontSize: 8, fontWeight: 700, color: GRAY, marginRight: 10, textTransform: "uppercase", letterSpacing: 0.3 },
  totalValor: { fontSize: 11, fontWeight: 700, color: ORANGE_HGI },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 26,
    right: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: GRAY,
    borderTopWidth: 0.5,
    borderTopColor: GRAY_LIGHT,
    paddingTop: 6,
  },
});

const LABELS_STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  RESPONDIDA: "Respondida",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface RodadaPdfFornecedor {
  id: string;
  nome: string;
  status: string;
  totalGeral: number;
  itens: {
    id: string;
    fabricante: string;
    descricao: string;
    unidade: string;
    quantidade: number;
    precoUnitario: number;
    total: number;
  }[];
}

export interface RodadaPdfData {
  numero: string;
  clienteNome: string;
  empreendimentoNome: string;
  dataEmissao: string;
  nomeEmissor: string;
  fornecedores: RodadaPdfFornecedor[];
}

export function RodadaPdfDocument({ data }: { data: RodadaPdfData }) {
  const somaTotal = data.fornecedores.reduce((s, f) => s + f.totalGeral, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.headerBar}>
          <View style={styles.headerLogoBox}>
            <LogoMalha />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerNome}>{data.nomeEmissor}</Text>
            <Text style={styles.headerMeta}>
              {data.clienteNome} · {data.empreendimentoNome}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerNumero}>{data.numero}</Text>
            <Text style={styles.headerData}>Emitida em {data.dataEmissao}</Text>
          </View>
        </View>

        {/* Comparativo */}
        <View style={styles.card} wrap={false}>
          <Text style={styles.secaoTitulo}>Comparativo entre fornecedores</Text>
          <Text style={styles.secaoSub}>Valor total cotado por cada fornecedor consultado nesta rodada</Text>

          <View style={styles.compTableHeader}>
            <Text style={[styles.compTh, styles.compThNome]}>Fornecedor</Text>
            <Text style={[styles.compTh, styles.compThTotal]}>Total Geral</Text>
          </View>
          {data.fornecedores.map((f) => (
            <View key={f.id} style={styles.compRow}>
              <Text style={[styles.compTd, styles.compTdNome]}>{f.nome}</Text>
              <Text style={[styles.compTd, styles.compTdTotal]}>{formatBRL(f.totalGeral)}</Text>
            </View>
          ))}

          {/* Gráfico de participação — barras finas, pontas arredondadas */}
          {data.fornecedores.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 7, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>
                Participação no total
              </Text>
              <Svg width="100%" height={data.fornecedores.length * 24 + 4} viewBox={`0 0 500 ${data.fornecedores.length * 24 + 4}`}>
                {(() => {
                  const larguraMaxima = 300;
                  const inicioBarraX = 150;
                  const alturaBarra = 7;
                  return data.fornecedores.map((f, i) => {
                    const pct = somaTotal > 0 ? (f.totalGeral / somaTotal) * 100 : 0;
                    const larguraBarra = Math.max((pct / 100) * larguraMaxima, alturaBarra);
                    const y = i * 24;
                    return (
                      <React.Fragment key={f.id}>
                        <SvgText x={0} y={y + 12} style={{ fontSize: 7.5, fill: "#333333" }}>
                          {f.nome.length > 20 ? f.nome.slice(0, 19) + "…" : f.nome}
                        </SvgText>
                        <Rect
                          x={inicioBarraX}
                          y={y + 8}
                          width={larguraMaxima}
                          height={alturaBarra}
                          fill={GRAY_LIGHT}
                          rx={alturaBarra / 2}
                        />
                        <Rect
                          x={inicioBarraX}
                          y={y + 8}
                          width={larguraBarra}
                          height={alturaBarra}
                          fill={ORANGE_HGI}
                          rx={alturaBarra / 2}
                        />
                        <SvgText x={inicioBarraX + larguraMaxima + 10} y={y + 14} style={{ fontSize: 7.5, fontWeight: 700, fill: NAVY }}>
                          {`${pct.toFixed(1)}%`}
                        </SvgText>
                      </React.Fragment>
                    );
                  });
                })()}
              </Svg>
            </View>
          )}
        </View>

        {/* Uma seção por fornecedor */}
        {data.fornecedores.map((f) => {
          const agrupados = new Map<string, typeof f.itens>();
          for (const item of [...f.itens].sort((a, b) => a.fabricante.localeCompare(b.fabricante))) {
            const arr = agrupados.get(item.fabricante) ?? [];
            arr.push(item);
            agrupados.set(item.fabricante, arr);
          }

          return (
            <View key={f.id} style={styles.card} wrap={false}>
              <View style={styles.fornecedorHeader}>
                <View style={styles.fornecedorBolinha} />
                <Text style={styles.fornecedorNome}>{f.nome}</Text>
              </View>

              {Array.from(agrupados.entries()).map(([fabricante, itens]) => (
                <View key={fabricante} style={{ marginBottom: 4 }}>
                  <Text style={styles.fabricanteSubtitulo}>{fabricante}</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.thDescricao]}>Descrição</Text>
                    <Text style={[styles.th, styles.thUnd]}>Und</Text>
                    <Text style={[styles.th, styles.thQtde]}>Qtde</Text>
                    <Text style={[styles.th, styles.thVUnit]}>V. Unit.</Text>
                    <Text style={[styles.th, styles.thVTotal]}>V. Total</Text>
                  </View>
                  {itens.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={[styles.td, styles.tdDescricao]}>{item.descricao}</Text>
                      <Text style={[styles.td, styles.tdUnd]}>{item.unidade}</Text>
                      <Text style={[styles.td, styles.tdQtde]}>{item.quantidade}</Text>
                      <Text style={[styles.td, styles.tdVUnit]}>{formatBRL(item.precoUnitario)}</Text>
                      <Text style={[styles.td, styles.tdVTotal]}>{formatBRL(item.total)}</Text>
                    </View>
                  ))}
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total {f.nome}</Text>
                <Text style={styles.totalValor}>{formatBRL(f.totalGeral)}</Text>
              </View>
            </View>
          );
        })}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${data.nomeEmissor} · Cotação ${data.numero} · Emitida em ${data.dataEmissao} · Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
