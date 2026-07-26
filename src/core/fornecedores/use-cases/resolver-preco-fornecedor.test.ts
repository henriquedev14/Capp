import { describe, it, expect } from "vitest";
import { resolverPrecoFornecedor } from "./resolver-preco-fornecedor";

describe("resolverPrecoFornecedor", () => {
  it("prioriza Cotação quando ela está disponível, mesmo com as outras 2 fontes também presentes", () => {
    const resultado = resolverPrecoFornecedor({
      cotacaoItem: { precoUnitario: 100, numeroCotacao: "COT-001", data: new Date("2026-07-01") },
      itemTabelaPreco: { valorUnitario: 90, nomeTabela: "Julho/2026", data: new Date("2026-07-15") },
      produtoFornecedor: { precoUnitario: 80 },
    });

    expect(resultado?.origem).toBe("COTACAO");
    expect(resultado?.precoUnitario).toBe(100);
    expect(resultado?.detalheOrigem).toBe("Cotação COT-001");
  });

  it("usa Tabela de Preços quando não há Cotação, mesmo com referência também presente", () => {
    const resultado = resolverPrecoFornecedor({
      cotacaoItem: null,
      itemTabelaPreco: { valorUnitario: 90, nomeTabela: "Julho/2026", data: new Date("2026-07-15") },
      produtoFornecedor: { precoUnitario: 80 },
    });

    expect(resultado?.origem).toBe("TABELA_PRECO");
    expect(resultado?.precoUnitario).toBe(90);
    expect(resultado?.detalheOrigem).toBe("Tabela Julho/2026");
  });

  it("cai pra referência quando só ela está disponível", () => {
    const resultado = resolverPrecoFornecedor({
      cotacaoItem: null,
      itemTabelaPreco: null,
      produtoFornecedor: { precoUnitario: 80 },
    });

    expect(resultado?.origem).toBe("REFERENCIA");
    expect(resultado?.precoUnitario).toBe(80);
  });

  it("retorna null quando nenhuma fonte tem o preço", () => {
    const resultado = resolverPrecoFornecedor({
      cotacaoItem: null,
      itemTabelaPreco: null,
      produtoFornecedor: null,
    });

    expect(resultado).toBeNull();
  });

  it("funciona também quando os campos nem são informados (undefined, não só null)", () => {
    const resultado = resolverPrecoFornecedor({});
    expect(resultado).toBeNull();
  });
});
