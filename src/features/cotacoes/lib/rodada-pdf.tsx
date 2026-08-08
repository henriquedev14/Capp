import * as React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// PDF consolidado da Rodada de Cotação — reúne todos os fornecedores
// num documento só: uma página de comparativo + uma página por
// fornecedor com o detalhe dos itens. Fase 2 do redesenho de
// Negociação (07/08/2026) — antes só existia exportação por
// fornecedor individual.

const NAVY = "#0B0F1A";
const ORANGE_HGI = "#FF731D";
const GRAY = "#6B7280";
const GRAY_LIGHT = "#E5E7EB";
const GRAY_BG = "#F4F5F7";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: "#1A1A1A", padding: 24, paddingBottom: 44 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: NAVY,
    marginBottom: 14,
  },
  headerNome: { fontSize: 12, fontWeight: 700, color: WHITE },
  headerMeta: { fontSize: 8, color: "#C7CCD6", marginTop: 2 },
  headerNumero: { fontSize: 11, fontWeight: 700, color: ORANGE_HGI },

  secaoTitulo: {
    fontSize: 10,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  compTableHeader: { flexDirection: "row", backgroundColor: NAVY },
  compTh: { fontSize: 7.5, fontWeight: 700, color: WHITE, padding: 6, textTransform: "uppercase" },
  compThNome: { flex: 1, textAlign: "left" },
  compThStatus: { width: 90, textAlign: "center" },
  compThTotal: { width: 90, textAlign: "right" },

  compRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: GRAY_LIGHT },
  compTd: { fontSize: 8, padding: 6, color: "#333" },
  compTdNome: { flex: 1, textAlign: "left", fontWeight: 700 },
  compTdStatus: { width: 90, textAlign: "center", color: GRAY },
  compTdTotal: { width: 90, textAlign: "right", fontWeight: 700, color: NAVY },

  fornecedorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    backgroundColor: GRAY_BG,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: ORANGE_HGI,
  },
  fornecedorNome: { fontSize: 10, fontWeight: 700, color: NAVY },
  fornecedorStatus: { fontSize: 8, color: GRAY },

  tableHeader: { flexDirection: "row", backgroundColor: NAVY, marginTop: 4 },
  th: { fontSize: 7.5, fontWeight: 700, color: WHITE, padding: 5, textTransform: "uppercase" },
  thFab: { width: 90, textAlign: "left" },
  thDescricao: { flex: 1, textAlign: "left" },
  thUnd: { width: 32, textAlign: "center" },
  thQtde: { width: 46, textAlign: "right" },
  thVUnit: { width: 62, textAlign: "right" },
  thVTotal: { width: 62, textAlign: "right" },

  itemRow: { flexDirection: "row", borderBottomWidth: 0.3, borderBottomColor: GRAY_LIGHT },
  td: { fontSize: 7.5, padding: 4, color: "#333" },
  tdFab: { width: 90, textAlign: "left", fontWeight: 700, color: NAVY },
  tdDescricao: { flex: 1, textAlign: "left" },
  tdUnd: { width: 32, textAlign: "center", textTransform: "uppercase" },
  tdQtde: { width: 46, textAlign: "right" },
  tdVUnit: { width: 62, textAlign: "right" },
  tdVTotal: { width: 62, textAlign: "right", fontWeight: 700 },

  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 8,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 0.5,
    borderTopColor: "#D1D5DB",
    marginTop: 4,
  },
  totalLabel: { fontSize: 9, fontWeight: 700, color: "#333", marginRight: 10 },
  totalValor: { fontSize: 10, fontWeight: 700, color: ORANGE_HGI },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: GRAY,
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
  return (
    <Document>
      {/* Tudo numa página contínua — react-pdf quebra pra próxima folha
          automaticamente conforme o conteúdo enche, sem forçar 1 página
          fixa por fornecedor. Ajustado em 07/08/2026 a pedido do
          Henrique: queria tudo concatenado, não separado. */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerNome}>{data.nomeEmissor}</Text>
            <Text style={styles.headerMeta}>
              {data.clienteNome} · {data.empreendimentoNome}
            </Text>
          </View>
          <Text style={styles.headerNumero}>{data.numero}</Text>
        </View>

        <Text style={styles.secaoTitulo}>Comparativo entre fornecedores</Text>
        <View style={styles.compTableHeader}>
          <Text style={[styles.compTh, styles.compThNome]}>Fornecedor</Text>
          <Text style={[styles.compTh, styles.compThStatus]}>Status</Text>
          <Text style={[styles.compTh, styles.compThTotal]}>Total Geral</Text>
        </View>
        {data.fornecedores.map((f) => (
          <View key={f.id} style={styles.compRow} wrap={false}>
            <Text style={[styles.compTd, styles.compTdNome]}>{f.nome}</Text>
            <Text style={[styles.compTd, styles.compTdStatus]}>{LABELS_STATUS[f.status] ?? f.status}</Text>
            <Text style={[styles.compTd, styles.compTdTotal]}>{formatBRL(f.totalGeral)}</Text>
          </View>
        ))}

        {data.fornecedores.map((f) => {
          const itensOrdenados = [...f.itens].sort((a, b) => a.fabricante.localeCompare(b.fabricante));

          return (
            <View key={f.id} style={{ marginTop: 16 }}>
              <View style={styles.fornecedorHeader} wrap={false}>
                <Text style={styles.fornecedorNome}>{f.nome}</Text>
                <Text style={styles.fornecedorStatus}>{LABELS_STATUS[f.status] ?? f.status}</Text>
              </View>

              <View style={styles.tableHeader} wrap={false}>
                <Text style={[styles.th, styles.thFab]}>Fabricante</Text>
                <Text style={[styles.th, styles.thDescricao]}>Descrição</Text>
                <Text style={[styles.th, styles.thUnd]}>Und</Text>
                <Text style={[styles.th, styles.thQtde]}>Qtde</Text>
                <Text style={[styles.th, styles.thVUnit]}>V. Unit.</Text>
                <Text style={[styles.th, styles.thVTotal]}>V. Total</Text>
              </View>
              {itensOrdenados.map((item) => (
                <View key={item.id} style={styles.itemRow} wrap={false}>
                  <Text style={[styles.td, styles.tdFab]}>{item.fabricante}</Text>
                  <Text style={[styles.td, styles.tdDescricao]}>{item.descricao}</Text>
                  <Text style={[styles.td, styles.tdUnd]}>{item.unidade}</Text>
                  <Text style={[styles.td, styles.tdQtde]}>{item.quantidade}</Text>
                  <Text style={[styles.td, styles.tdVUnit]}>{formatBRL(item.precoUnitario)}</Text>
                  <Text style={[styles.td, styles.tdVTotal]}>{formatBRL(item.total)}</Text>
                </View>
              ))}

              <View style={styles.totalRow} wrap={false}>
                <Text style={styles.totalLabel}>TOTAL {f.nome.toUpperCase()}</Text>
                <Text style={styles.totalValor}>{formatBRL(f.totalGeral)}</Text>
              </View>
            </View>
          );
        })}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Documento gerado pelo ${data.nomeEmissor} — emitido em ${data.dataEmissao} — página ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
