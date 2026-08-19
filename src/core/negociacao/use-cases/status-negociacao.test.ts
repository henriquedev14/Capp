import { describe, it, expect } from "vitest";
import {
  derivarStatusNegociacao,
  calcularPrioridade,
  resolverValorNegociadoAtual,
  type InteracaoParaStatus,
  type InteracaoParaValor,
} from "./status-negociacao";

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

  it("última interação RETORNO_ENGENHARIA volta pra AGUARDANDO_CLIENTE", () => {
    expect(derivarStatusNegociacao([interacao("RETORNO_ENGENHARIA", 1)])).toBe("AGUARDANDO_CLIENTE");
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

describe("resolverValorNegociadoAtual", () => {
  function interacaoValor(diasAtras: number, valorNegociado: number | null): InteracaoParaValor {
    const agora = new Date("2026-08-08T12:00:00Z");
    return { createdAt: new Date(agora.getTime() - diasAtras * 24 * 60 * 60 * 1000), valorNegociado };
  }

  it("sem nenhuma interação com valor, usa o valorBase", () => {
    const r = resolverValorNegociadoAtual([interacaoValor(5, null), interacaoValor(1, null)], 100_000);
    expect(r).toBe(100_000);
  });

  it("lista vazia também cai no valorBase", () => {
    expect(resolverValorNegociadoAtual([], 100_000)).toBe(100_000);
  });

  it("usa o valor da interação mais recente que TEM valor — não a mais recente de qualquer tipo", () => {
    // renegociou pra 80k há 5 dias, depois teve um follow-up sem valor ontem — não pode "voltar" pro base
    const r = resolverValorNegociadoAtual(
      [interacaoValor(5, 80_000), interacaoValor(1, null)],
      100_000
    );
    expect(r).toBe(80_000);
  });

  it("com duas renegociações, usa a mais recente por data, não a última do array", () => {
    const r = resolverValorNegociadoAtual(
      [interacaoValor(2, 80_000), interacaoValor(10, 90_000)], // fora de ordem de propósito
      100_000
    );
    expect(r).toBe(80_000);
  });
});
