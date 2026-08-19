import { describe, it, expect } from "vitest";
import { consolidarItensPorMaterial, type ItemMaterialParaConsolidar } from "./consolidar-itens-material";

function item(overrides: Partial<ItemMaterialParaConsolidar>): ItemMaterialParaConsolidar {
  return {
    id: "i1",
    descricao: "Cabo Verde 2,5mm",
    categoria: "Cabos",
    marca: "Barbi",
    unidade: "M",
    quantidade: 100,
    precoUnitario: 2,
    total: 200,
    tipologiaNome: "Tipo A",
    ...overrides,
  };
}

describe("consolidarItensPorMaterial", () => {
  it("soma quantidade e total do mesmo material vindo de tipologias diferentes, com 10% de margem de perda", () => {
    const r = consolidarItensPorMaterial([
      item({ id: "i1", tipologiaNome: "Tipo A", quantidade: 100, total: 200 }),
      item({ id: "i2", tipologiaNome: "Tipo B", quantidade: 50, total: 100 }),
    ]);
    expect(r).toHaveLength(1);
    // bruto: 150 / 300 -> com 10% de margem: 165 / 330
    expect(r[0]!.quantidade).toBeCloseTo(165, 5);
    expect(r[0]!.total).toBeCloseTo(330, 5);
    // preço unitário é o preço REAL do material — a margem não mexe nele
    expect(r[0]!.precoUnitario).toBe(2);
  });

  it("a margem de 10% nunca muda o preço unitário, só quantidade/total", () => {
    const r = consolidarItensPorMaterial([item({ id: "i1", quantidade: 10, total: 50, precoUnitario: 5 })]);
    expect(r[0]!.quantidade).toBeCloseTo(11, 5); // 10 * 1.1
    expect(r[0]!.total).toBeCloseTo(55, 5); // 50 * 1.1
    expect(r[0]!.precoUnitario).toBe(5); // inalterado
  });

  it("lista as tipologias que contribuíram, sem duplicar", () => {
    const r = consolidarItensPorMaterial([
      item({ id: "i1", tipologiaNome: "Tipo A" }),
      item({ id: "i2", tipologiaNome: "Tipo B" }),
    ]);
    expect(r[0]!.tipologias.sort()).toEqual(["Tipo A", "Tipo B"]);
  });

  it("não consolida materiais com descrição diferente", () => {
    const r = consolidarItensPorMaterial([
      item({ id: "i1", descricao: "Cabo Verde 2,5mm" }),
      item({ id: "i2", descricao: "Cabo Azul 2,5mm" }),
    ]);
    expect(r).toHaveLength(2);
  });

  it("não consolida a mesma descrição de marcas diferentes (não é o mesmo produto)", () => {
    const r = consolidarItensPorMaterial([
      item({ id: "i1", marca: "Barbi" }),
      item({ id: "i2", marca: "Nanoplastic" }),
    ]);
    expect(r).toHaveLength(2);
  });

  it("marca origemUnica só quando TODOS os itens do grupo vêm da mesma fonte", () => {
    const r1 = consolidarItensPorMaterial([
      item({ id: "i1", cotacaoItemId: "cot-1" }),
      item({ id: "i2", cotacaoItemId: "cot-1" }),
    ]);
    expect(r1[0]!.origemUnica).toBe("COTACAO");

    const r2 = consolidarItensPorMaterial([
      item({ id: "i1", cotacaoItemId: "cot-1" }),
      item({ id: "i2", cotacaoItemId: null, itemTabelaPrecoId: "tab-1" }),
    ]);
    expect(r2[0]!.origemUnica).toBeNull();
  });

  it("ordena por descrição", () => {
    const r = consolidarItensPorMaterial([
      item({ id: "i1", descricao: "Zebra Cabo" }),
      item({ id: "i2", descricao: "Alpha Cabo" }),
    ]);
    expect(r.map((i) => i.descricao)).toEqual(["Alpha Cabo", "Zebra Cabo"]);
  });

  it("lida com quantidade zero sem dividir por zero", () => {
    const r = consolidarItensPorMaterial([item({ id: "i1", quantidade: 0, total: 0 })]);
    expect(r[0]!.precoUnitario).toBe(0);
  });
});
