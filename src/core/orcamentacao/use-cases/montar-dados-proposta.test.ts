import { describe, it, expect } from "vitest";
import { montarDadosProposta, type DadosParaMontarProposta } from "./montar-dados-proposta";
import type { AnexoMateriaisProposta } from "@/features/orcamentacao/lib/proposta-anexo-materiais";

function inputBase(overrides: Partial<DadosParaMontarProposta> = {}): DadosParaMontarProposta {
  return {
    empreendimentoCodigo: "E-0001",
    empreendimentoNome: "Residencial Teste",
    empreendimentoCidade: "Uberlândia",
    empreendimentoEstado: "MG",
    empreendimentoTipoEstrutura: null,
    revisao: 2,
    cliente: {
      nomeFantasia: "Cliente Fantasia",
      razaoSocial: "Cliente Razão Social Ltda",
      cnpj: "12345678000199",
      logradouro: "Rua Teste, 123",
      cidade: "Uberlândia",
      estado: "MG",
    },
    totalUnidadesHabitacionais: 10,
    usuario: { nome: "Fulano", cargo: "Comercial", email: "fulano@teste.com", telefone: "34999999999" },
    totalMaoDeObra: 100000,
    anexoMateriais: { totalGeral: 50000 } as AnexoMateriaisProposta,
    ...overrides,
  };
}

describe("montarDadosProposta", () => {
  it("monta o número da proposta como código do empreendimento + REV + revisão", () => {
    const data = montarDadosProposta(inputBase({ empreendimentoCodigo: "E-0042", revisao: 3 }));
    expect(data.numeroProposta).toBe("E-0042-REV3");
  });

  it("usa nomeFantasia do cliente quando disponível, senão razaoSocial", () => {
    const comFantasia = montarDadosProposta(inputBase());
    expect(comFantasia.cliente.nome).toBe("Cliente Fantasia");

    const semFantasia = montarDadosProposta(
      inputBase({ cliente: { ...inputBase().cliente, nomeFantasia: null } })
    );
    expect(semFantasia.cliente.nome).toBe("Cliente Razão Social Ltda");
  });

  it("calcula valores por unidade dividindo pelo total de unidades habitacionais", () => {
    const data = montarDadosProposta(inputBase({ totalMaoDeObra: 100000, totalUnidadesHabitacionais: 10 }));
    expect(data.investimento.maoDeObraUnitario).toBe(10000);
    expect(data.investimento.materiaisUnitario).toBe(5000); // 50000 / 10
  });

  it("valores por unidade ficam null quando não há unidades habitacionais", () => {
    const data = montarDadosProposta(inputBase({ totalUnidadesHabitacionais: 0 }));
    expect(data.empreendimento.unidadesHabitacionais).toBeNull();
    expect(data.investimento.maoDeObraUnitario).toBeNull();
    expect(data.investimento.materiaisUnitario).toBeNull();
  });

  it("formata o endereço do cliente combinando logradouro e cidade-estado", () => {
    const data = montarDadosProposta(inputBase());
    expect(data.cliente.endereco).toBe("Rua Teste, 123, Uberlândia-MG");
  });

  it("usa 'Não informado' quando o cliente não tem nenhum dado de endereço", () => {
    const data = montarDadosProposta(
      inputBase({ cliente: { ...inputBase().cliente, logradouro: null, cidade: null, estado: null } })
    );
    expect(data.cliente.endereco).toBe("Não informado");
  });

  it("usa 'Não informado' pros dados do associado quando usuário é null", () => {
    const data = montarDadosProposta(inputBase({ usuario: null }));
    expect(data.associado.nome).toBe("Não informado");
    expect(data.associado.cargo).toBe("Não informado");
  });
});
