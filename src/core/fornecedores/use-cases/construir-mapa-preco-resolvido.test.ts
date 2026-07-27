import { describe, it, expect } from "vitest";
import { construirMapaPrecoResolvido } from "./construir-mapa-preco-resolvido";

describe("construirMapaPrecoResolvido (Tarefa 2.3.3)", () => {
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

  it("não inclui no mapa um material que só existe na Tabela, mas não em ProdutoFornecedor", () => {
    const mapa = construirMapaPrecoResolvido({
      produtosOferecidos: [],
      tabelasPreco: [
        {
          dataImportacao: new Date("2026-07-01"),
          itens: [{ materialEletricoId: "mat-so-na-tabela", valorUnitario: 50 }],
        },
      ],
    });

    expect(mapa.has("mat-so-na-tabela")).toBe(false);
  });

  it("ignora item da tabela que não bate com nenhum material do ProdutoFornecedor (usa referência pra esse)", () => {
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
    expect(mapa.has("mat-diferente")).toBe(false);
  });
});
