import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Circle,
  Line,
} from "@react-pdf/renderer";

// Documento de Cotação — layout inspirado na planilha QDC Pacaembu:
//  * cabeçalho compacto com ConstructApp + info do orçamento + box com
//    TOTAL ELÉTRICA e TOTAL P/QDC (dois totais separados por kit);
//  * tabela horizontal com colunas DESCRIÇÃO | UND | QTDE TOTAL |
//    VALOR UNIT. | VALOR TOTAL | OBSERVAÇÃO;
//  * agrupamento por fabricante com faixa cinza clara e subtotal ao fim.
// A ideia é que o operador da HGI baixe esse PDF, mande por WhatsApp/email
// pro fornecedor, e ele responda com os valores atualizados.

const NAVY = "#0B0F1A";
const GREEN = "#22C55E";
const ORANGE_HGI = "#FF731D";
const GRAY = "#6B7280";
const GRAY_LIGHT = "#E5E7EB";
const GRAY_BG = "#F4F5F7";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1A1A1A",
    padding: 24,
    paddingBottom: 44,
  },
  // Cabeçalho: grid 3 colunas (logo | info | totais)
  header: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: GRAY_LIGHT,
    marginBottom: 12,
  },
  headerLogo: {
    width: 90,
    padding: 10,
    backgroundColor: GRAY_BG,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: GRAY_LIGHT,
  },
  headerLogoName: { fontSize: 11, fontWeight: 700, color: NAVY, marginTop: 4 },
  headerLogoTag: { fontSize: 6, color: GRAY, letterSpacing: 1, marginTop: 2 },
  headerInfo: { flex: 1, padding: 10, gap: 3 },
  headerInfoTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: NAVY,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerInfoRow: { flexDirection: "row", gap: 4 },
  headerInfoLabel: { fontSize: 8, fontWeight: 700, color: "#333" },
  headerInfoValue: { fontSize: 8, color: "#555" },
  headerTotais: {
    width: 180,
    padding: 10,
    borderLeftWidth: 0.5,
    borderLeftColor: GRAY_LIGHT,
    justifyContent: "center",
    gap: 6,
  },
  headerTotalLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_LIGHT,
    paddingBottom: 4,
  },
  headerTotalLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#333",
    textTransform: "uppercase",
  },
  headerTotalValor: { fontSize: 10, fontWeight: 700, color: NAVY },
  headerTotalGeralLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: ORANGE_HGI,
    textTransform: "uppercase",
  },
  headerTotalGeralValor: { fontSize: 11, fontWeight: 700, color: ORANGE_HGI },

  // Metadados do documento (número, data, fornecedor, status)
  metaBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: 6,
    backgroundColor: NAVY,
  },
  metaText: { fontSize: 8, color: WHITE },
  metaBold: { fontWeight: 700 },

  // Cabeçalho da tabela
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    borderTopWidth: 0.5,
    borderTopColor: GRAY_LIGHT,
  },
  th: {
    fontSize: 7.5,
    fontWeight: 700,
    color: WHITE,
    padding: 5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  thDescricao: { flex: 1, textAlign: "left" },
  thUnd: { width: 32, textAlign: "center" },
  thQtde: { width: 46, textAlign: "right" },
  thVUnit: { width: 62, textAlign: "right" },
  thVTotal: { width: 62, textAlign: "right" },
  thObs: { width: 60, textAlign: "left" },

  // Linhas
  fabricanteRow: {
    flexDirection: "row",
    backgroundColor: GRAY_BG,
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_LIGHT,
  },
  fabricanteText: {
    padding: 4,
    paddingLeft: 6,
    fontSize: 8,
    fontWeight: 700,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  itemRow: {
    flexDirection: "row",
    borderBottomWidth: 0.3,
    borderBottomColor: GRAY_LIGHT,
  },
  td: { fontSize: 7.5, padding: 4, color: "#333" },
  tdDescricao: { flex: 1, textAlign: "left" },
  tdUnd: { width: 32, textAlign: "center", textTransform: "uppercase" },
  tdQtde: { width: 46, textAlign: "right" },
  tdVUnit: { width: 62, textAlign: "right" },
  tdVTotal: { width: 62, textAlign: "right", fontWeight: 700 },
  tdObs: { width: 60, textAlign: "left", color: GRAY, fontSize: 7 },

  subtotalRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#D1D5DB",
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_LIGHT,
    backgroundColor: "#FAFAFA",
  },
  subtotalSpacer: { flex: 1 },
  subtotalLabel: {
    fontSize: 7.5,
    padding: 4,
    color: "#333",
    fontWeight: 700,
    textAlign: "right",
    width: 140,
  },
  subtotalValor: {
    fontSize: 8,
    padding: 4,
    color: NAVY,
    fontWeight: 700,
    textAlign: "right",
    width: 62,
  },
  subtotalObs: { width: 60 },

  // Rodapé
  footer: {
    position: "absolute",
    bottom: 18,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: GRAY_LIGHT,
    paddingTop: 6,
  },
  footerText: { fontSize: 6.5, color: GRAY },
});

function LogoMalha({ size = 34 }: { size?: number }) {
  // Copiado do proposta-pdf pra manter consistência de marca
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
          <Line
            key={`${i}-${j}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={NAVY}
            strokeWidth={0.4}
          />
        ))
      )}
      {pts.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.6} fill={GREEN} />
      ))}
    </Svg>
  );
}

export interface CotacaoPdfItem {
  descricao: string;
  fabricante: string;
  unidade: string;
  kit: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  observacao?: string | null;
}

export interface CotacaoPdfData {
  numero: string;
  status: string;
  clienteNome: string;
  empreendimentoNome: string;
  empreendimentoCidade: string;
  empreendimentoEstado: string;
  fornecedorNome: string;
  fornecedorCnpj: string;
  dataEmissao: string;
  validadeAte: string | null;
  totalEletrica: number;
  totalQdc: number;
  totalGeral: number;
  itens: CotacaoPdfItem[];
  observacoes: string | null;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatNumero(v: number): string {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const LABEL_STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  RESPONDIDA: "Respondida",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

export function CotacaoDocument({ data }: { data: CotacaoPdfData }) {
  // Agrupa itens por fabricante para o layout tipo QDC.
  // Fabricantes ordenados alfabeticamente pra ficar previsível.
  const porFabricante = new Map<string, CotacaoPdfItem[]>();
  for (const item of data.itens) {
    const arr = porFabricante.get(item.fabricante) ?? [];
    arr.push(item);
    porFabricante.set(item.fabricante, arr);
  }
  const grupos = Array.from(porFabricante.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho de 3 colunas: logo | info | totais */}
        <View style={styles.header} fixed>
          <View style={styles.headerLogo}>
            <LogoMalha />
            <Text style={styles.headerLogoName}>ConstructApp</Text>
            <Text style={styles.headerLogoTag}>HGI GROUP</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerInfoTitle}>ORÇAMENTO</Text>
            <View style={styles.headerInfoRow}>
              <Text style={styles.headerInfoLabel}>CLIENTE:</Text>
              <Text style={styles.headerInfoValue}>{data.clienteNome}</Text>
            </View>
            <View style={styles.headerInfoRow}>
              <Text style={styles.headerInfoLabel}>OBRA:</Text>
              <Text style={styles.headerInfoValue}>
                {data.empreendimentoNome} — {data.empreendimentoCidade}/
                {data.empreendimentoEstado}
              </Text>
            </View>
            <View style={styles.headerInfoRow}>
              <Text style={styles.headerInfoLabel}>FORNECEDOR:</Text>
              <Text style={styles.headerInfoValue}>{data.fornecedorNome}</Text>
            </View>
            {data.fornecedorCnpj && (
              <View style={styles.headerInfoRow}>
                <Text style={styles.headerInfoLabel}>CNPJ:</Text>
                <Text style={styles.headerInfoValue}>{data.fornecedorCnpj}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerTotais}>
            <View style={styles.headerTotalLinha}>
              <Text style={styles.headerTotalLabel}>Total Elétrica</Text>
              <Text style={styles.headerTotalValor}>
                {formatBRL(data.totalEletrica)}
              </Text>
            </View>
            <View style={styles.headerTotalLinha}>
              <Text style={styles.headerTotalLabel}>Total P/ QDC</Text>
              <Text style={styles.headerTotalValor}>
                {formatBRL(data.totalQdc)}
              </Text>
            </View>
            <View
              style={[
                styles.headerTotalLinha,
                { borderBottomWidth: 0, paddingTop: 2 },
              ]}
            >
              <Text style={styles.headerTotalGeralLabel}>Total Geral</Text>
              <Text style={styles.headerTotalGeralValor}>
                {formatBRL(data.totalGeral)}
              </Text>
            </View>
          </View>
        </View>

        {/* Metadata em faixa escura */}
        <View style={styles.metaBar} fixed>
          <Text style={styles.metaText}>
            <Text style={styles.metaBold}>Número: </Text>
            {data.numero}
            {"  •  "}
            <Text style={styles.metaBold}>Status: </Text>
            {LABEL_STATUS[data.status] ?? data.status}
            {"  •  "}
            <Text style={styles.metaBold}>Emitido em: </Text>
            {data.dataEmissao}
            {data.validadeAte && (
              <>
                {"  •  "}
                <Text style={styles.metaBold}>Válida até: </Text>
                {data.validadeAte}
              </>
            )}
          </Text>
        </View>

        {/* Cabeçalho da tabela */}
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.th, styles.thDescricao]}>Descrição</Text>
          <Text style={[styles.th, styles.thUnd]}>Und</Text>
          <Text style={[styles.th, styles.thQtde]}>Qtde Total</Text>
          <Text style={[styles.th, styles.thVUnit]}>Valor Unit.</Text>
          <Text style={[styles.th, styles.thVTotal]}>Valor Total</Text>
          <Text style={[styles.th, styles.thObs]}>Observação</Text>
        </View>

        {/* Corpo — grupos por fabricante */}
        {grupos.map(([fabricante, itens]) => {
          const subtotal = itens.reduce((s, i) => s + i.total, 0);
          return (
            <View key={fabricante} wrap={false}>
              <View style={styles.fabricanteRow}>
                <Text style={styles.fabricanteText}>{fabricante}</Text>
              </View>
              {itens.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={[styles.td, styles.tdDescricao]}>
                    {item.descricao}
                  </Text>
                  <Text style={[styles.td, styles.tdUnd]}>{item.unidade}</Text>
                  <Text style={[styles.td, styles.tdQtde]}>
                    {formatNumero(item.quantidade)}
                  </Text>
                  <Text style={[styles.td, styles.tdVUnit]}>
                    {formatBRL(item.precoUnitario)}
                  </Text>
                  <Text style={[styles.td, styles.tdVTotal]}>
                    {formatBRL(item.total)}
                  </Text>
                  <Text style={[styles.td, styles.tdObs]}>
                    {item.observacao ?? ""}
                  </Text>
                </View>
              ))}
              <View style={styles.subtotalRow}>
                <View style={styles.subtotalSpacer} />
                <Text style={styles.subtotalLabel}>
                  Subtotal {fabricante}:
                </Text>
                <Text style={styles.subtotalValor}>{formatBRL(subtotal)}</Text>
                <View style={styles.subtotalObs} />
              </View>
            </View>
          );
        })}

        {/* Observações livres (se houver) */}
        {data.observacoes && (
          <View style={{ marginTop: 12, padding: 8, backgroundColor: GRAY_BG }}>
            <Text style={{ fontSize: 8, fontWeight: 700, marginBottom: 3 }}>
              Observações:
            </Text>
            <Text style={{ fontSize: 8, color: "#333", lineHeight: 1.4 }}>
              {data.observacoes}
            </Text>
          </View>
        )}

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento gerado pelo ConstructApp — sistema interno HGI Group
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
