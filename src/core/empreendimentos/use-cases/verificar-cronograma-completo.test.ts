import { describe, it, expect } from "vitest";
import { verificarCronogramaCompleto } from "./verificar-cronograma-completo";

describe("verificarCronogramaCompleto", () => {
  it("empreendimento sem pavimento nenhum conta como completo", () => {
    expect(verificarCronogramaCompleto([])).toBe(true);
  });

  it("todos os pavimentos com data — completo", () => {
    const r = verificarCronogramaCompleto([
      { dataPrevistaRemessa: new Date() },
      { dataPrevistaRemessa: new Date() },
    ]);
    expect(r).toBe(true);
  });

  it("algum pavimento sem data — incompleto", () => {
    const r = verificarCronogramaCompleto([{ dataPrevistaRemessa: new Date() }, { dataPrevistaRemessa: null }]);
    expect(r).toBe(false);
  });

  it("nenhum pavimento com data — incompleto", () => {
    const r = verificarCronogramaCompleto([{ dataPrevistaRemessa: null }, { dataPrevistaRemessa: null }]);
    expect(r).toBe(false);
  });
});
