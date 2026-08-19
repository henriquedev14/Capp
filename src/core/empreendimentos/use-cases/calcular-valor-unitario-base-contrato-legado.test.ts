import { describe, expect, it } from "vitest";
import {
  calcularValorUnitarioBaseContratoLegado,
  calcularValorEstimadoPorKitLegado,
} from "./calcular-valor-unitario-base-contrato-legado";

describe("calcularValorUnitarioBaseContratoLegado", () => {
  it("calcula 80% do contrato dividido pela quantidade-base", () => {
    // R$ 1.000.000, 20% de entrada -> 800.000 / 50 unidades = 16.000
    expect(calcularValorUnitarioBaseContratoLegado(1_000_000, 50)).toBe(16_000);
  });

  it("retorna null sem valor contratado ou sem quantidade-base", () => {
    expect(calcularValorUnitarioBaseContratoLegado(null, 50)).toBeNull();
    expect(calcularValorUnitarioBaseContratoLegado(1_000_000, null)).toBeNull();
    expect(calcularValorUnitarioBaseContratoLegado(1_000_000, 0)).toBeNull();
  });
});

describe("calcularValorEstimadoPorKitLegado", () => {
  it("reparte o pool de 80% proporcionalmente à quantidade quando nenhum kit tem valor específico", () => {
    // pool = 1.000.000 * 0.8 = 800.000, repartido 50/50/50 (soma 150) -> 1/3 pra cada,
    // com o método do maior resto os 2 primeiros levam o centavo que sobra (soma exata)
    const resultado = calcularValorEstimadoPorKitLegado(1_000_000, [
      { kit: "ELETRICO", quantidadeContratada: 50 },
      { kit: "HIDRAULICO", quantidadeContratada: 50 },
      { kit: "QDC", quantidadeContratada: 50 },
    ]);
    expect(resultado).toHaveLength(3);
    expect(resultado.every((r) => r.origem === "estimado")).toBe(true);
    expect(resultado.reduce((s, r) => s + r.valorEstimado, 0)).toBe(800_000);
    expect(resultado[0].valorEstimado).toBe(266_666.67);
    expect(resultado[1].valorEstimado).toBe(266_666.67);
    expect(resultado[2].valorEstimado).toBe(266_666.66);
  });

  it("reparte proporcionalmente por quantidade quando as quantidades diferem entre kits", () => {
    // pool = 800.000, quantidades 30/50/20 (soma 100) -> 30%/50%/20%
    const resultado = calcularValorEstimadoPorKitLegado(1_000_000, [
      { kit: "ELETRICO", quantidadeContratada: 30 },
      { kit: "HIDRAULICO", quantidadeContratada: 50 },
      { kit: "QDC", quantidadeContratada: 20 },
    ]);
    expect(resultado.find((r) => r.kit === "ELETRICO")?.valorEstimado).toBeCloseTo(240_000, 2);
    expect(resultado.find((r) => r.kit === "HIDRAULICO")?.valorEstimado).toBeCloseTo(400_000, 2);
    expect(resultado.find((r) => r.kit === "QDC")?.valorEstimado).toBeCloseTo(160_000, 2);
  });

  it("usa valorContratoEspecifico direto quando informado, sem tratar como estimativa", () => {
    const resultado = calcularValorEstimadoPorKitLegado(1_000_000, [
      { kit: "ELETRICO", quantidadeContratada: 50, valorContratoEspecifico: 500_000 },
      { kit: "HIDRAULICO", quantidadeContratada: 50 },
    ]);
    const eletrico = resultado.find((r) => r.kit === "ELETRICO")!;
    const hidraulico = resultado.find((r) => r.kit === "HIDRAULICO")!;
    expect(eletrico.origem).toBe("informado");
    expect(eletrico.valorEstimado).toBe(500_000);
    // resto do pool (800.000 - 500.000 = 300.000) vai inteiro pro único kit sem valor real
    expect(hidraulico.origem).toBe("estimado");
    expect(hidraulico.valorEstimado).toBeCloseTo(300_000, 2);
  });

  it("nunca deixa o pool restante ficar negativo se os valores específicos somarem mais que 80% do contrato", () => {
    const resultado = calcularValorEstimadoPorKitLegado(1_000_000, [
      { kit: "ELETRICO", quantidadeContratada: 50, valorContratoEspecifico: 900_000 },
      { kit: "HIDRAULICO", quantidadeContratada: 50 },
    ]);
    const hidraulico = resultado.find((r) => r.kit === "HIDRAULICO")!;
    expect(hidraulico.valorEstimado).toBe(0);
  });

  it("retorna lista vazia sem valor contratado ou sem kits", () => {
    expect(calcularValorEstimadoPorKitLegado(null, [{ kit: "ELETRICO", quantidadeContratada: 10 }])).toEqual([]);
    expect(calcularValorEstimadoPorKitLegado(1_000_000, [])).toEqual([]);
  });
});
