import { describe, expect, it } from "vitest";
import {
  calcularComplexidadeEletrica,
  calcularComplexidadeHidraulica,
} from "@/features/analytics/lib/complexidade-engenharia";

describe("complexidade de Engenharia", () => {
  it("a repetição de unidades cresce com ganho de escala, não linearmente", () => {
    const base = {
      area: 60,
      pecas: 12,
      circuitos: 30,
      circuitosUnicos: 8,
      revisao: 1,
      tier: 2,
      kitQdc: true,
      tipoEstrutura: "PAREDE_DE_CONCRETO",
      metodoConstrutivo: null,
      tiposInstalacao: "[]",
    };
    const uma = calcularComplexidadeEletrica({ ...base, unidades: 1 });
    const cem = calcularComplexidadeEletrica({ ...base, unidades: 100 });
    expect(cem).toBeGreaterThan(uma);
    expect(cem - uma).toBeLessThan(10);
  });

  it("pacote elétrico tecnicamente mais denso recebe mais pontos", () => {
    const simples = calcularComplexidadeEletrica({
      area: 45, unidades: 20, pecas: 5, circuitos: 10, circuitosUnicos: 4, revisao: 1,
      tier: 3, kitQdc: false, tipoEstrutura: "PAREDE_DE_CONCRETO", metodoConstrutivo: null, tiposInstalacao: "[]",
    });
    const complexo = calcularComplexidadeEletrica({
      area: 180, unidades: 20, pecas: 35, circuitos: 90, circuitosUnicos: 20, revisao: 3,
      tier: 0, kitQdc: true, tipoEstrutura: "CONCRETO_ARMADO", metodoConstrutivo: "convencional", tiposInstalacao: '["TETO","PISO","SHAFT"]',
    });
    expect(complexo).toBeGreaterThan(simples);
  });

  it("hidráulica usa fórmula própria e respeita variedade/subtipo", () => {
    const aguaFria = calcularComplexidadeHidraulica({ area: 70, unidades: 50, itens: 8, variedadeItens: 4, subtipo: "AGUA_FRIA", tier: 2, tipoEstrutura: "PAREDE_DE_CONCRETO", metodoConstrutivo: null });
    const esgoto = calcularComplexidadeHidraulica({ area: 70, unidades: 50, itens: 20, variedadeItens: 12, subtipo: "ESGOTO", tier: 2, tipoEstrutura: "PAREDE_DE_CONCRETO", metodoConstrutivo: null });
    expect(esgoto).toBeGreaterThan(aguaFria);
  });
});
