import { describe, it, expect } from "vitest";
import { construirMapaPrecoResolvido } from "./construir-mapa-preco-resolvido";

describe("construirMapaPrecoResolvido", () => {
  it("usa o preço da Tabela de Preços quando ela tem o material, mesmo com ProdutoFornecedor também tendo", () => {
    const mapa = construirMapaPrecoResolvido({
      produtosOferecidos: [{ materialEletricoId: "mat-1", precoUnitario: 80 }],
      tabelasPreco: [
        {
          dataImportacao: new Date("2026-07-01"),
          itens: [{ materialEletricoId: "mat-1", valorUnitario: 95 }],
        },
      ],
    });

    expect(mapa.get("mat-1")).toBe(95);
  });

  it("usa o preço de referência do ProdutoFornecedor quando não há Tabela ativa", () => {
    const mapa = construirMapaPrecoResolvido({
      produtosOferecidos: [{ materialEletricoId: "mat-1", precoUnitario: 80 }],
      tabelasPreco: [],
    });

    expect(mapa.get("mat-1")).toBe(80);
  });

  it("inclui no mapa um material que só existe na Tabela, mesmo sem ProdutoFornecedor (correção 27/07/2026 — fornecedor sem cotação prévia não podia ser cotado)", () => {
    const mapa = construirMapaPrecoResolvido({
      produtosOferecidos: [],
      tabelasPreco: [
        {
          dataImportacao: new Date("2026-07-01"),
          itens: [{ materialEletricoId: "mat-so-na-tabela", valorUnitario: 50 }],
        },
      ],
    });

    expect(mapa.get("mat-so-na-tabela")).toBe(50);
  });

  it("cada material usa a fonte certa quando fornecedor e tabela cobrem materiais diferentes", () => {
    const mapa = construirMapaPrecoResolvido({
      produtosOferecidos: [{ materialEletricoId: "mat-2", precoUnitario: 30 }],
      tabelasPreco: [
        {
          dataImportacao: new Date("2026-07-01"),
          itens: [{ materialEletricoId: "mat-diferente", valorUnitario: 999 }],
        },
      ],
    });

    expect(mapa.get("mat-2")).toBe(30);
    expect(mapa.get("mat-diferente")).toBe(999);
  });
});
