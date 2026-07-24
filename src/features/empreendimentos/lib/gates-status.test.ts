import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/infra/db/prisma/client";
import { verificarGateOrcamentacao, verificarGateNegociacao } from "./gates-status";

/**
 * Testes de caracterização (Tarefa 1.3.1 do Plano Mestre) — travam o
 * comportamento ATUAL das regras de gate antes de mexermos em
 * arquitetura (Épico 2). Não são testes "bonitos" de unidade — são
 * testes de integração de verdade, contra o banco, porque a lógica
 * está inteiramente amarrada a consultas Prisma.
 *
 * Roda com: npm run test (precisa de um banco de dados real disponível
 * via DATABASE_URL — usar sempre staging local, nunca produção).
 */

const PREFIXO_TESTE = "TESTE-1.3.1-";

async function limparDadosDeTeste() {
  await prisma.empreendimento.deleteMany({ where: { codigo: { startsWith: PREFIXO_TESTE } } });
  await prisma.cliente.deleteMany({ where: { codigo: { startsWith: PREFIXO_TESTE } } });
}

async function criarClienteTeste() {
  return prisma.cliente.create({
    data: {
      codigo: `${PREFIXO_TESTE}CLI-${Date.now()}`,
      razaoSocial: "Cliente de Teste — Caracterização",
      cnpj: `${Date.now()}`.padStart(14, "0").slice(0, 14),
    },
  });
}

async function criarEmpreendimentoTeste(clienteId: string, opts: { kitEletrico: boolean; kitHidraulico: boolean }) {
  return prisma.empreendimento.create({
    data: {
      codigo: `${PREFIXO_TESTE}EMP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nome: "Empreendimento de Teste — Caracterização",
      construtora: "Construtora de Teste",
      responsavelComercial: "Responsável de Teste",
      clienteId,
      cidade: "Uberlândia",
      estado: "MG",
      endereco: "Rua de Teste, 123",
      tipo: "RESIDENCIAL_VERTICAL",
      kitEletrico: opts.kitEletrico,
      kitHidraulico: opts.kitHidraulico,
    },
  });
}

async function criarTipologiaTeste(empreendimentoId: string, nome: string) {
  return prisma.tipologia.create({
    data: { empreendimentoId, nome, quantidadeUnidades: 1 },
  });
}

describe("verificarGateOrcamentacao", () => {
  afterEach(async () => {
    await limparDadosDeTeste();
  });

  it("bloqueia quando kitEletrico=true e o Levantamento Elétrico não está validado", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: true, kitHidraulico: false });
    const tipologia = await criarTipologiaTeste(emp.id, "Tipo A");

    await prisma.levantamentoEletrico.create({
      data: { empreendimentoId: emp.id, tipologiaId: tipologia.id, status: "RASCUNHO" },
    });
    await prisma.levantamentoMateriais.create({
      data: { empreendimentoId: emp.id, tipologiaId: tipologia.id, status: "VALIDADO" },
    });

    const resultado = await verificarGateOrcamentacao(emp.id, true, false);
    expect(resultado).toHaveProperty("erro");
    if ("erro" in resultado) {
      expect(resultado.erro).toContain("Tipo A");
      expect(resultado.erro).toContain("Levantamento Elétrico");
    }
  });

  it("bloqueia quando kitEletrico=true e o Levantamento de Materiais não está validado", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: true, kitHidraulico: false });
    const tipologia = await criarTipologiaTeste(emp.id, "Tipo B");

    await prisma.levantamentoEletrico.create({
      data: { empreendimentoId: emp.id, tipologiaId: tipologia.id, status: "VALIDADO" },
    });
    await prisma.levantamentoMateriais.create({
      data: { empreendimentoId: emp.id, tipologiaId: tipologia.id, status: "RASCUNHO" },
    });

    const resultado = await verificarGateOrcamentacao(emp.id, true, false);
    expect(resultado).toHaveProperty("erro");
    if ("erro" in resultado) {
      expect(resultado.erro).toContain("Levantamento de Materiais");
    }
  });

  it("libera quando kitEletrico=true e ambos levantamentos estão validados", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: true, kitHidraulico: false });
    const tipologia = await criarTipologiaTeste(emp.id, "Tipo C");

    await prisma.levantamentoEletrico.create({
      data: { empreendimentoId: emp.id, tipologiaId: tipologia.id, status: "VALIDADO" },
    });
    await prisma.levantamentoMateriais.create({
      data: { empreendimentoId: emp.id, tipologiaId: tipologia.id, status: "VALIDADO" },
    });

    const resultado = await verificarGateOrcamentacao(emp.id, true, false);
    expect(resultado).toEqual({ ok: true });
  });

  it("não exige nada de elétrico/materiais quando kitEletrico=false", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: false, kitHidraulico: false });
    await criarTipologiaTeste(emp.id, "Tipo D");
    // Nenhum levantamento criado — mesmo assim deve liberar, já que
    // kitEletrico é false.

    const resultado = await verificarGateOrcamentacao(emp.id, false, false);
    expect(resultado).toEqual({ ok: true });
  });

  it("exige Levantamento Hidráulico validado quando kitHidraulico=true, exceto pra tipologia Hall", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: false, kitHidraulico: true });
    const tipologiaNormal = await criarTipologiaTeste(emp.id, "Tipo E");
    const tipologiaHall = await criarTipologiaTeste(emp.id, "Hall");

    // Nenhum levantamento hidráulico criado pra nenhuma das duas.
    const resultado = await verificarGateOrcamentacao(emp.id, false, true);
    expect(resultado).toHaveProperty("erro");
    if ("erro" in resultado) {
      // Deve reclamar da tipologia normal...
      expect(resultado.erro).toContain("Tipo E");
      // ...mas NUNCA do Hall (exceção deliberada no código).
      expect(resultado.erro).not.toContain("Hall");
    }
  });
});

describe("verificarGateNegociacao", () => {
  afterEach(async () => {
    await limparDadosDeTeste();
  });

  it("bloqueia quando não existe nenhum orçamento", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: true, kitHidraulico: false });

    const resultado = await verificarGateNegociacao(emp.id);
    expect(resultado).toHaveProperty("erro");
  });

  it("bloqueia quando o orçamento existe mas a proposta ainda não foi gerada", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: true, kitHidraulico: false });
    await prisma.orcamento.create({
      data: { empreendimentoId: emp.id, revisao: 1 },
    });

    const resultado = await verificarGateNegociacao(emp.id);
    expect(resultado).toHaveProperty("erro");
  });

  it("libera quando a revisão mais recente já tem propostaGeradaEm preenchido", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: true, kitHidraulico: false });
    await prisma.orcamento.create({
      data: { empreendimentoId: emp.id, revisao: 1, propostaGeradaEm: new Date() },
    });

    const resultado = await verificarGateNegociacao(emp.id);
    expect(resultado).toEqual({ ok: true });
  });

  it("verifica sempre a revisão MAIS RECENTE, não a primeira criada", async () => {
    const cliente = await criarClienteTeste();
    const emp = await criarEmpreendimentoTeste(cliente.id, { kitEletrico: true, kitHidraulico: false });
    // Revisão 1 já teve proposta gerada (cenário antigo)...
    await prisma.orcamento.create({
      data: { empreendimentoId: emp.id, revisao: 1, propostaGeradaEm: new Date() },
    });
    // ...mas a revisão 2 (mais nova) ainda não gerou a proposta dela.
    await prisma.orcamento.create({
      data: { empreendimentoId: emp.id, revisao: 2, propostaGeradaEm: null },
    });

    const resultado = await verificarGateNegociacao(emp.id);
    // Deve bloquear — a revisão vigente (2) não tem proposta, não importa
    // que uma revisão antiga tivesse.
    expect(resultado).toHaveProperty("erro");
  });
});
