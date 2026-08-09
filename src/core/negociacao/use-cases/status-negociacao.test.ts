import { describe, it, expect } from "vitest";
import { derivarStatusNegociacao, calcularPrioridade, type InteracaoParaStatus } from "./status-negociacao";

function interacao(tipo: string, diasAtras: number, proximaAcaoDiasAtras?: number): InteracaoParaStatus {
  const agora = new Date("2026-08-08T12:00:00Z");
  return {
    tipo,
    createdAt: new Date(agora.getTime() - diasAtras * 24 * 60 * 60 * 1000),
    proximaAcaoData:
      proximaAcaoDiasAtras !== undefined
        ? new Date(agora.getTime() - proximaAcaoDiasAtras * 24 * 60 * 60 * 1000)
        : null,
  };
}

describe("derivarStatusNegociacao", () => {
  it("sem interação nenhuma, aguardando cliente (estado inicial)", () => {
    expect(derivarStatusNegociacao([])).toBe("AGUARDANDO_CLIENTE");
  });

  it("última interação GANHA vira Aprovada", () => {
    const r = derivarStatusNegociacao([interacao("COTACAO_ENVIADA", 5), interacao("GANHA", 1)]);
    expect(r).toBe("APROVADA");
  });

  it("última interação PERDIDA vira Recusada", () => {
    expect(derivarStatusNegociacao([interacao("PERDIDA", 1)])).toBe("RECUSADA");
  });

  it("última interação RETORNO_ENGENHARIA reflete isso", () => {
    expect(derivarStatusNegociacao([interacao("RETORNO_ENGENHARIA", 1)])).toBe("RETORNOU_ENGENHARIA");
  });

  it("última interação CONTRAPROPOSTA vira Em Revisão", () => {
    expect(derivarStatusNegociacao([interacao("CONTRAPROPOSTA", 1)])).toBe("EM_REVISAO");
  });

  it("usa sempre a interação MAIS RECENTE, não a última do array", () => {
    // GANHA aconteceu primeiro (mais antiga), depois voltou a negociar de novo
    const r = derivarStatusNegociacao([interacao("GANHA", 10), interacao("CONTATO", 1)]);
    expect(r).toBe("AGUARDANDO_CLIENTE");
  });
});

describe("calcularPrioridade", () => {
  const AGORA = new Date("2026-08-08T12:00:00Z");

  it("sem interação nenhuma, prioridade normal (nada aconteceu ainda)", () => {
    const r = calcularPrioridade([], AGORA);
    expect(r.prioridade).toBe("normal");
  });

  it("interação recente (1 dia) é normal", () => {
    const r = calcularPrioridade([interacao("CONTATO", 1)], AGORA);
    expect(r.prioridade).toBe("normal");
    expect(r.diasSemInteracao).toBe(1);
  });

  it("4-7 dias sem interação vira atenção", () => {
    const r = calcularPrioridade([interacao("CONTATO", 5)], AGORA);
    expect(r.prioridade).toBe("atencao");
  });

  it("mais de 7 dias sem interação vira crítica", () => {
    const r = calcularPrioridade([interacao("CONTATO", 8)], AGORA);
    expect(r.prioridade).toBe("critica");
  });

  it("follow-up vencido é crítica mesmo com poucos dias desde a última interação", () => {
    const r = calcularPrioridade([interacao("CONTRAPROPOSTA", 1, 1)], AGORA); // próxima ação já passou ontem
    expect(r.prioridade).toBe("critica");
    expect(r.followUpVencido).toBe(true);
  });

  it("follow-up NO FUTURO não conta como vencido", () => {
    const r = calcularPrioridade([interacao("CONTRAPROPOSTA", 1, -2)], AGORA); // próxima ação daqui a 2 dias
    expect(r.followUpVencido).toBe(false);
    expect(r.prioridade).toBe("normal");
  });
});
