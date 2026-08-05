import { describe, it, expect } from "vitest";
import { calcularJornadaReal } from "./calcular-jornada-real";

const BASE = {
  jornadaExistente: [],
  levantamentosOk: false,
  totalServicosHgi: 0,
  totalItensMaterial: 0,
  cotacoes: [],
  statusOrcamento: "EM_LEVANTAMENTO" as const,
  propostaGeradaEm: null,
};

function statusDe(resultado: ReturnType<typeof calcularJornadaReal>, etapa: string) {
  return resultado.find((e) => e.etapa === etapa)?.status;
}

describe("calcularJornadaReal", () => {
  it("tudo NAO_INICIADA/EM_ANDAMENTO quando nada foi feito ainda", () => {
    const r = calcularJornadaReal(BASE);
    expect(statusDe(r, "LEVANTAMENTOS")).toBe("EM_ANDAMENTO");
    expect(statusDe(r, "COMPOSICAO")).toBe("NAO_INICIADA");
    expect(statusDe(r, "MATERIAIS")).toBe("NAO_INICIADA");
    expect(statusDe(r, "COTACOES")).toBe("NAO_INICIADA");
    expect(statusDe(r, "REVISAO")).toBe("NAO_INICIADA");
    expect(statusDe(r, "APROVACAO")).toBe("NAO_INICIADA");
    expect(statusDe(r, "PROPOSTA")).toBe("NAO_INICIADA");
  });

  it("marca Levantamentos concluído quando o gate de orçamentação passa", () => {
    const r = calcularJornadaReal({ ...BASE, levantamentosOk: true });
    expect(statusDe(r, "LEVANTAMENTOS")).toBe("CONCLUIDA");
    expect(statusDe(r, "MATERIAIS")).toBe("EM_ANDAMENTO"); // levantamentos ok mas bloco 2 ainda vazio
  });

  it("marca Composição e Materiais concluídos quando os blocos têm itens", () => {
    const r = calcularJornadaReal({ ...BASE, totalServicosHgi: 334800, totalItensMaterial: 12 });
    expect(statusDe(r, "COMPOSICAO")).toBe("CONCLUIDA");
    expect(statusDe(r, "MATERIAIS")).toBe("CONCLUIDA");
  });

  it("Cotações: NAO_INICIADA sem nenhuma, EM_ANDAMENTO com rascunho, CONCLUIDA só com uma aceita", () => {
    expect(statusDe(calcularJornadaReal(BASE), "COTACOES")).toBe("NAO_INICIADA");
    expect(statusDe(calcularJornadaReal({ ...BASE, cotacoes: [{ status: "RASCUNHO" }] }), "COTACOES")).toBe(
      "EM_ANDAMENTO"
    );
    expect(
      statusDe(
        calcularJornadaReal({ ...BASE, cotacoes: [{ status: "RASCUNHO" }, { status: "ACEITA" }] }),
        "COTACOES"
      )
    ).toBe("CONCLUIDA");
  });

  it("Revisão e Aprovação seguem o status real do orçamento — CRÍTICO: reproduz o bug real (cliente aceitou, jornada dizia 0%)", () => {
    const r = calcularJornadaReal({
      ...BASE,
      levantamentosOk: true,
      totalServicosHgi: 334800,
      totalItensMaterial: 12,
      cotacoes: [{ status: "ACEITA" }],
      statusOrcamento: "ORCAMENTO_APROVADO",
      propostaGeradaEm: "2026-07-24T15:04:00.000Z",
    });
    expect(statusDe(r, "REVISAO")).toBe("CONCLUIDA");
    expect(statusDe(r, "APROVACAO")).toBe("APROVADA");
    expect(statusDe(r, "PROPOSTA")).toBe("CONCLUIDA");
    // Todas as 7 etapas concluídas/aprovadas — é isso que deveria ter
    // aparecido no caso real que o Henrique reportou.
    expect(r.every((e) => e.status === "CONCLUIDA" || e.status === "APROVADA")).toBe(true);
  });

  it("Devolvido marca Revisão e Aprovação como DEVOLVIDA", () => {
    const r = calcularJornadaReal({ ...BASE, statusOrcamento: "ORCAMENTO_DEVOLVIDO" });
    expect(statusDe(r, "REVISAO")).toBe("DEVOLVIDA");
    expect(statusDe(r, "APROVACAO")).toBe("DEVOLVIDA");
  });

  it("preserva responsável/prazo/pendências já cadastrados manualmente", () => {
    const r = calcularJornadaReal({
      ...BASE,
      jornadaExistente: [
        {
          id: "j1",
          orcamentoId: "orc1",
          etapa: "LEVANTAMENTOS",
          status: "NAO_INICIADA",
          responsavelId: "user-123",
          dataPrevista: "2026-08-01",
        } as never,
      ],
    });
    const etapa = r.find((e) => e.etapa === "LEVANTAMENTOS");
    expect(etapa?.responsavelId).toBe("user-123");
    expect(etapa?.dataPrevista).toBe("2026-08-01");
  });

  it("respeita BLOQUEADA marcada manualmente, sem sobrescrever com o cálculo automático", () => {
    const r = calcularJornadaReal({
      ...BASE,
      levantamentosOk: true, // o cálculo automático diria CONCLUIDA
      jornadaExistente: [
        {
          id: "j1",
          orcamentoId: "orc1",
          etapa: "LEVANTAMENTOS",
          status: "BLOQUEADA",
          motivoBloqueio: "Aguardando aprovação de escopo extra",
        } as never,
      ],
    });
    expect(statusDe(r, "LEVANTAMENTOS")).toBe("BLOQUEADA");
  });
});
