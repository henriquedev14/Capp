import { describe, it, expect } from "vitest";
import { validarCamposObrigatoriosProposta } from "./validar-proposta";

describe("validarCamposObrigatoriosProposta", () => {
  it("bloqueia quando o cliente não foi encontrado", () => {
    const erro = validarCamposObrigatoriosProposta({
      clienteEncontrado: false,
      totalMaoDeObra: 1000,
      totalMateriais: 500,
    });
    expect(erro).toContain("Cliente não encontrado");
  });

  it("bloqueia quando o total de mão de obra é zero", () => {
    const erro = validarCamposObrigatoriosProposta({
      clienteEncontrado: true,
      totalMaoDeObra: 0,
      totalMateriais: 500,
    });
    expect(erro).toContain("mão de obra");
  });

  it("bloqueia quando o total de materiais é zero", () => {
    const erro = validarCamposObrigatoriosProposta({
      clienteEncontrado: true,
      totalMaoDeObra: 1000,
      totalMateriais: 0,
    });
    expect(erro).toContain("materiais");
  });

  it("libera (retorna null) quando tudo está preenchido", () => {
    const erro = validarCamposObrigatoriosProposta({
      clienteEncontrado: true,
      totalMaoDeObra: 1000,
      totalMateriais: 500,
    });
    expect(erro).toBeNull();
  });
});
