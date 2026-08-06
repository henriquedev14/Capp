import { describe, it, expect } from "vitest";
import { classificarQuadrante, gerarAtencoesDaEquipe, type PessoaProdutividade } from "./classificar-quadrante";

function pessoa(overrides: Partial<PessoaProdutividade>): PessoaProdutividade {
  return {
    usuarioId: "u1",
    nome: "Fulano",
    papel: "ENGENHARIA",
    cargaAtual: 0,
    itensParados: 0,
    produzidoNoPeriodo: 0,
    ...overrides,
  };
}

describe("classificarQuadrante", () => {
  it("carga baixa + sem parado = Tranquilo", () => {
    const [r] = classificarQuadrante([pessoa({ cargaAtual: 2, itensParados: 0 })]);
    expect(r.zona).toBe("TRANQUILO");
  });

  it("carga baixa + com parado = Processo Bloqueado", () => {
    const [r] = classificarQuadrante([pessoa({ cargaAtual: 2, itensParados: 1 })]);
    expect(r.zona).toBe("PROCESSO_BLOQUEADO");
  });

  it("carga alta + sem parado = Ocupado e em dia", () => {
    const [r] = classificarQuadrante([pessoa({ cargaAtual: 7, itensParados: 0 })]);
    expect(r.zona).toBe("OCUPADO_EM_DIA");
  });

  it("carga alta + com parado = Sobrecarga Crítica", () => {
    const [r] = classificarQuadrante([pessoa({ cargaAtual: 7, itensParados: 3 })]);
    expect(r.zona).toBe("SOBRECARGA_CRITICA");
  });

  it("respeita limites customizados, não só o padrão", () => {
    const [r] = classificarQuadrante([pessoa({ cargaAtual: 3, itensParados: 0 })], {
      cargaAlta: 2,
      itensParadosAlto: 1,
    });
    expect(r.zona).toBe("OCUPADO_EM_DIA");
  });

  it("o limite é exatamente o valor configurado (>=), não só acima dele", () => {
    const [r] = classificarQuadrante([pessoa({ cargaAtual: 6, itensParados: 1 })]);
    expect(r.zona).toBe("SOBRECARGA_CRITICA");
  });
});

describe("gerarAtencoesDaEquipe", () => {
  it("separa quem precisa de suporte de quem é destaque, sem misturar", () => {
    const pontos = classificarQuadrante([
      pessoa({ usuarioId: "a", nome: "Carlos", cargaAtual: 7, itensParados: 3, produzidoNoPeriodo: 11 }),
      pessoa({ usuarioId: "b", nome: "Fernanda", cargaAtual: 6, itensParados: 0, produzidoNoPeriodo: 9 }),
      pessoa({ usuarioId: "c", nome: "Marcos", cargaAtual: 2, itensParados: 0, produzidoNoPeriodo: 0 }),
    ]);
    const { precisamDeSuporte, destaques } = gerarAtencoesDaEquipe(pontos);

    expect(precisamDeSuporte.map((p) => p.nome)).toEqual(["Carlos"]);
    expect(destaques.map((p) => p.nome)).toEqual(["Fernanda"]);
  });

  it("ordena quem precisa de suporte pelos mais parados primeiro", () => {
    const pontos = classificarQuadrante([
      pessoa({ usuarioId: "a", nome: "Pouco Parado", cargaAtual: 7, itensParados: 1 }),
      pessoa({ usuarioId: "b", nome: "Muito Parado", cargaAtual: 7, itensParados: 5 }),
    ]);
    const { precisamDeSuporte } = gerarAtencoesDaEquipe(pontos);
    expect(precisamDeSuporte[0]!.nome).toBe("Muito Parado");
  });

  it("não quebra com lista vazia", () => {
    const { precisamDeSuporte, destaques } = gerarAtencoesDaEquipe([]);
    expect(precisamDeSuporte).toEqual([]);
    expect(destaques).toEqual([]);
  });
});
