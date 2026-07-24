import { describe, it, expect } from "vitest";
import { calcularItensServico } from "./calcular-itens-servico";
import type { Tipologia } from "@/core/empreendimentos/entities/estrutura-fisica";
import type { TabelaPrecoBase } from "@/core/orcamentacao/entities/orcamento";

/**
 * Testes de caracterização (Tarefa 1.3.2 do Plano Mestre) — travam o
 * comportamento ATUAL do cálculo financeiro do Bloco 1 (Serviço HGI)
 * antes de mexermos em arquitetura (Épico 2).
 *
 * `calcularItensServico` é uma função PURA (sem banco), então esses são
 * testes de unidade de verdade — rápidos, sem precisar de staging.
 */

function tipologia(overrides: Partial<Tipologia> = {}): Tipologia {
  return {
    id: "tip-1",
    empreendimentoId: "emp-1",
    nome: "Tipo A",
    areaPrivativa: 60,
    quantidadeUnidades: 1,
    ...overrides,
  };
}

function faixaEletrico(overrides: Partial<TabelaPrecoBase> = {}): TabelaPrecoBase {
  return {
    id: "faixa-1",
    kit: "ELETRICO",
    criterio: "AREA",
    areaMin: 0,
    areaMax: 100,
    descricao: "Até 100m²",
    precoBase: 1000,
    ...overrides,
  };
}

describe("calcularItensServico — critério AREA", () => {
  it("calcula precoUnitario = precoBase × multiplicadorTier, e total = precoUnitario × quantidade", () => {
    const t = tipologia({ areaPrivativa: 60 });
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 3]]),
      kitsContratados: ["ELETRICO"],
      kitsProntosPorTipologia: new Map([[t.id, ["ELETRICO"]]]),
      tabelaPreco: [faixaEletrico({ precoBase: 1000 })],
      multiplicadorTier: 1.2,
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].precoBase).toBe(1000);
    expect(resultado[0].precoUnitario).toBe(1200);
    expect(resultado[0].total).toBe(3600); // 1200 × 3 unidades
  });

  it("marca simulado=true e total=0 quando o levantamento daquele kit/tipologia ainda não foi validado", () => {
    const t = tipologia();
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 2]]),
      kitsContratados: ["ELETRICO"],
      kitsProntosPorTipologia: new Map(), // nenhum kit pronto pra essa tipologia
      tabelaPreco: [faixaEletrico()],
      multiplicadorTier: 1.0,
    });

    expect(resultado[0].simulado).toBe(true);
    expect(resultado[0].total).toBe(0);
    // precoUnitario continua calculado (é só o total que zera) — o valor
    // "estimado" precisa aparecer na tela, só não soma no total do cliente.
    expect(resultado[0].precoUnitario).toBeGreaterThan(0);
  });

  it("marca semPreco=true e precoBase=0 quando não existe faixa pro kit na tabela", () => {
    const t = tipologia();
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 1]]),
      kitsContratados: ["HIDRAULICO"], // não tem faixa de HIDRAULICO na tabela abaixo
      kitsProntosPorTipologia: new Map([[t.id, ["HIDRAULICO"]]]),
      tabelaPreco: [faixaEletrico()], // só tem ELETRICO
      multiplicadorTier: 1.0,
    });

    expect(resultado[0].semPreco).toBe(true);
    expect(resultado[0].precoBase).toBe(0);
  });

  it("usa a maior faixa disponível quando a área excede o máximo da tabela", () => {
    const t = tipologia({ areaPrivativa: 500 }); // bem acima de qualquer faixa
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 1]]),
      kitsContratados: ["ELETRICO"],
      kitsProntosPorTipologia: new Map([[t.id, ["ELETRICO"]]]),
      tabelaPreco: [
        faixaEletrico({ areaMin: 0, areaMax: 60, precoBase: 800 }),
        faixaEletrico({ id: "f2", areaMin: 60, areaMax: 100, precoBase: 1000 }),
      ],
      multiplicadorTier: 1.0,
    });

    // Deve cair na faixa de maior areaMax (100), não travar/zerar.
    expect(resultado[0].precoBase).toBe(1000);
    expect(resultado[0].semPreco).toBe(false);
  });

  it("usa a primeira faixa quando a área é 0/nula", () => {
    const t = tipologia({ areaPrivativa: null });
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 1]]),
      kitsContratados: ["ELETRICO"],
      kitsProntosPorTipologia: new Map([[t.id, ["ELETRICO"]]]),
      tabelaPreco: [faixaEletrico({ areaMin: 0, areaMax: 60, precoBase: 800 })],
      multiplicadorTier: 1.0,
    });

    expect(resultado[0].precoBase).toBe(800);
  });

  it("pula a tipologia inteira quando a quantidade é 0 (não gera item nenhum pra ela)", () => {
    const t1 = tipologia({ id: "tip-1" });
    const t2 = tipologia({ id: "tip-2", nome: "Tipo B" });
    const resultado = calcularItensServico({
      tipologias: [t1, t2],
      quantidadesPorTipologia: new Map([
        [t1.id, 0], // zero unidades desse tipo no empreendimento
        [t2.id, 5],
      ]),
      kitsContratados: ["ELETRICO"],
      kitsProntosPorTipologia: new Map([
        [t1.id, ["ELETRICO"]],
        [t2.id, ["ELETRICO"]],
      ]),
      tabelaPreco: [faixaEletrico()],
      multiplicadorTier: 1.0,
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipologiaId).toBe("tip-2");
  });

  it("nunca inclui o kit QDC, mesmo se contratado — não tem levantamento próprio ainda", () => {
    const t = tipologia();
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 1]]),
      kitsContratados: ["ELETRICO", "QDC"],
      kitsProntosPorTipologia: new Map([[t.id, ["ELETRICO"]]]),
      tabelaPreco: [faixaEletrico()],
      multiplicadorTier: 1.0,
    });

    expect(resultado.every((i) => i.kit !== "QDC")).toBe(true);
    expect(resultado).toHaveLength(1); // só o item de ELETRICO
  });

  it("gera um item por combinação tipologia × kit contratado", () => {
    const t = tipologia();
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 1]]),
      kitsContratados: ["ELETRICO", "HIDRAULICO"],
      kitsProntosPorTipologia: new Map([[t.id, ["ELETRICO", "HIDRAULICO"]]]),
      tabelaPreco: [faixaEletrico(), faixaEletrico({ id: "f-hidr", kit: "HIDRAULICO", precoBase: 700 })],
      multiplicadorTier: 1.0,
    });

    expect(resultado).toHaveLength(2);
    expect(resultado.map((i) => i.kit).sort()).toEqual(["ELETRICO", "HIDRAULICO"]);
  });
});

describe("calcularItensServico — critério PONTOS_TETO", () => {
  it("aplica a fórmula: valorMinimo quando pontos <= pontosInclusos (sem excedente)", () => {
    const t = tipologia();
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 1]]),
      kitsContratados: ["ELETRICO"],
      kitsProntosPorTipologia: new Map([[t.id, ["ELETRICO"]]]),
      tabelaPreco: [],
      multiplicadorTier: 1.0,
      criterio: "PONTOS_TETO",
      pontosTetoPorTipologia: new Map([[t.id, 4]]), // abaixo do incluso (6)
      formulaPontos: { valorMinimo: 550, pontosInclusos: 6, valorPorPontoExtra: 70 },
    });

    expect(resultado[0].precoBase).toBe(550); // sem excedente, é só o mínimo
  });

  it("aplica a fórmula: valorMinimo + excedente × valorPorPontoExtra quando pontos > pontosInclusos", () => {
    const t = tipologia();
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 1]]),
      kitsContratados: ["ELETRICO"],
      kitsProntosPorTipologia: new Map([[t.id, ["ELETRICO"]]]),
      tabelaPreco: [],
      multiplicadorTier: 1.0,
      criterio: "PONTOS_TETO",
      pontosTetoPorTipologia: new Map([[t.id, 10]]), // 4 pontos acima do incluso (6)
      formulaPontos: { valorMinimo: 550, pontosInclusos: 6, valorPorPontoExtra: 70 },
    });

    expect(resultado[0].precoBase).toBe(550 + 4 * 70); // 830
  });

  it("usa a fórmula padrão (550/6/70) quando formulaPontos não é informado", () => {
    const t = tipologia();
    const resultado = calcularItensServico({
      tipologias: [t],
      quantidadesPorTipologia: new Map([[t.id, 1]]),
      kitsContratados: ["ELETRICO"],
      kitsProntosPorTipologia: new Map([[t.id, ["ELETRICO"]]]),
      tabelaPreco: [],
      multiplicadorTier: 1.0,
      criterio: "PONTOS_TETO",
      pontosTetoPorTipologia: new Map([[t.id, 6]]),
      // formulaPontos omitido de propósito
    });

    expect(resultado[0].precoBase).toBe(550);
  });
});
