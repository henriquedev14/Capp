import { describe, it, expect } from "vitest";
import { calcularProgressoLevantamento, type TipologiaParaProgresso } from "./calcular-progresso-levantamento";

function tipologia(nome: string, eletrico: boolean, materiais: boolean, hidraulico = false): TipologiaParaProgresso {
  return {
    nome,
    temLevantamentoEletricoValidado: eletrico,
    temLevantamentoMateriaisValidado: materiais,
    temLevantamentoHidraulicoValidado: hidraulico,
  };
}

describe("calcularProgressoLevantamento", () => {
  it("3 de 5 tipologias com elétrico validado — mostra progresso parcial, não 'nada feito'", () => {
    const tipologias = [
      tipologia("A", true, true),
      tipologia("B", true, true),
      tipologia("C", true, false),
      tipologia("D", false, false),
      tipologia("E", false, false),
    ];
    const r = calcularProgressoLevantamento(tipologias, true, false);
    expect(r.eletricoValidados).toBe(3);
    expect(r.eletricoTotal).toBe(5);
    expect(r.naoIniciado).toBe(false);
    expect(r.completo).toBe(false);
  });

  it("todas validadas — completo", () => {
    const tipologias = [tipologia("A", true, true), tipologia("B", true, true)];
    const r = calcularProgressoLevantamento(tipologias, true, false);
    expect(r.completo).toBe(true);
  });

  it("nenhuma validada — naoIniciado true", () => {
    const tipologias = [tipologia("A", false, false), tipologia("B", false, false)];
    const r = calcularProgressoLevantamento(tipologias, true, false);
    expect(r.naoIniciado).toBe(true);
    expect(r.completo).toBe(false);
  });

  it("kitEletrico=false não conta elétrico/materiais", () => {
    const tipologias = [tipologia("A", false, false, true)];
    const r = calcularProgressoLevantamento(tipologias, false, true);
    expect(r.eletricoTotal).toBe(0);
    expect(r.hidraulicoTotal).toBe(1);
  });

  it("tipologia Hall não conta pra hidráulico", () => {
    const tipologias = [tipologia("Hall", false, false, false), tipologia("Apto 101", false, false, true)];
    const r = calcularProgressoLevantamento(tipologias, false, true);
    expect(r.hidraulicoTotal).toBe(1);
    expect(r.hidraulicoValidados).toBe(1);
  });

  it("materiais validado mas elétrico não — completo continua false", () => {
    const tipologias = [tipologia("A", false, true)];
    const r = calcularProgressoLevantamento(tipologias, true, false);
    expect(r.completo).toBe(false);
  });
});
