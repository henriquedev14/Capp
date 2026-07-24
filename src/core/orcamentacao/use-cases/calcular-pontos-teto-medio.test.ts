import { describe, it, expect } from "vitest";
import { calcularPontosMedioPorApartamento } from "./calcular-pontos-teto-medio";

describe("calcularPontosMedioPorApartamento", () => {
  it("soma pontos × quantidade de cada tipologia, divide pelo total de apartamentos", () => {
    // Exemplo do próprio Henrique: tipologia com 10 pontos e 5 unidades
    // contribui 50 pontos pro total.
    const media = calcularPontosMedioPorApartamento([
      { tipologiaId: "A", pontos: 10, quantidadeUnidades: 5 }, // 50 pontos, 5 aps
    ]);
    expect(media).toBe(10); // 50 / 5 = 10
  });

  it("combina múltiplas tipologias com pontos e quantidades diferentes", () => {
    const media = calcularPontosMedioPorApartamento([
      { tipologiaId: "A", pontos: 10, quantidadeUnidades: 5 }, // 50 pontos, 5 aps
      { tipologiaId: "B", pontos: 20, quantidadeUnidades: 10 }, // 200 pontos, 10 aps
    ]);
    // total pontos = 250, total apartamentos = 15
    expect(media).toBeCloseTo(250 / 15, 5);
  });

  it("retorna 0 quando não há nenhuma unidade (evita divisão por zero)", () => {
    const media = calcularPontosMedioPorApartamento([]);
    expect(media).toBe(0);
  });

  it("tipologia com 0 unidades não distorce a média (nem no numerador, nem no denominador)", () => {
    const media = calcularPontosMedioPorApartamento([
      { tipologiaId: "A", pontos: 999, quantidadeUnidades: 0 }, // não conta
      { tipologiaId: "B", pontos: 10, quantidadeUnidades: 2 },
    ]);
    expect(media).toBe(10); // só a tipologia B conta: 20 pontos / 2 aps
  });
});
