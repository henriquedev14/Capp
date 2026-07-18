import "dotenv/config";
import bcrypt from "bcryptjs";

import { prisma } from "./client";
import { PERMISSOES, DESCRICOES_PERMISSOES } from "@/core/auth/permissions";
import { seedMateriaisPex } from "./seed-materiais-pex";
import { seedMateriaisCatalogo } from "./seed-materiais-catalogo";

/**
 * Script de seed do banco de dados.
 *
 * Popula:
 * 1. O catálogo de Permissao a partir de src/core/auth/permissions.ts —
 *    a única fonte da verdade sobre quais permissões existem no código.
 * 2. Um Papel "Admin" com todas as permissões atribuídas.
 * 3. Um Usuario administrador inicial, necessário para o primeiro login —
 *    não existe tela de "criar conta": todo usuário é criado pelo Admin.
 *
 * Dados de exemplo de Empreendimento (estrutura física, tipologias) ainda
 * não são semeados aqui — ficam para quando o módulo de Engenharia/
 * Levantamento existir e houver necessidade real de dados de teste.
 */
async function main() {
  console.log("[seed] Sincronizando catálogo de permissões...");
  for (const chave of Object.values(PERMISSOES)) {
    await prisma.permissao.upsert({
      where: { chave },
      update: { descricao: DESCRICOES_PERMISSOES[chave] },
      create: { chave, descricao: DESCRICOES_PERMISSOES[chave] },
    });
  }

  console.log("[seed] Garantindo papel Admin com todas as permissões...");
  const todasPermissoes = await prisma.permissao.findMany();
  const papelAdmin = await prisma.papel.upsert({
    where: { nome: "Admin" },
    update: {},
    create: {
      nome: "Admin",
      descricao: "Acesso completo ao sistema, incluindo gestão de usuários e papéis.",
    },
  });
  for (const permissao of todasPermissoes) {
    await prisma.papelPermissao.upsert({
      where: { papelId_permissaoId: { papelId: papelAdmin.id, permissaoId: permissao.id } },
      update: {},
      create: { papelId: papelAdmin.id, permissaoId: permissao.id },
    });
  }

  console.log("[seed] Garantindo as 5 bancadas de produção...");
  const bancadasIniciais = [
    { nome: "Corte de Fio", ordem: 1, unidadeMedida: "METROS" as const, tipoCalculo: "CABO" as const, uhReferencia: 126.1 },
    { nome: "Corte de Eletroduto", ordem: 2, unidadeMedida: "METROS" as const, tipoCalculo: "ELETRODUTO" as const, uhReferencia: 144.1 },
    { nome: "Kit Polvo", ordem: 3, unidadeMedida: "PECAS" as const, tipoCalculo: "CONTAGEM" as const, uhReferencia: 7 },
    { nome: "Fechamento", ordem: 4, unidadeMedida: "PECAS" as const, tipoCalculo: "CONTAGEM" as const, uhReferencia: 38.6 },
    { nome: "Finalização", ordem: 5, unidadeMedida: "PECAS" as const, tipoCalculo: "CONTAGEM" as const, uhReferencia: 0.6 },
  ];
  for (const b of bancadasIniciais) {
    await prisma.bancada.upsert({
      where: { nome: b.nome },
      update: { tipoCalculo: b.tipoCalculo }, // preenche em bancadas já existentes (rodadas de seed anteriores não tinham esse campo)
      create: b,
    });
  }

  console.log("[seed] Garantindo papel Financeiro...");
  const papelFinanceiro = await prisma.papel.upsert({
    where: { nome: "Financeiro" },
    update: {},
    create: {
      nome: "Financeiro",
      descricao: "Acesso ao módulo financeiro — contas a pagar, cadastros e lançamentos.",
    },
  });
  const permissoesFinanceiro = todasPermissoes.filter((p) => p.chave.startsWith("financeiro:"));
  for (const permissao of permissoesFinanceiro) {
    await prisma.papelPermissao.upsert({
      where: { papelId_permissaoId: { papelId: papelFinanceiro.id, permissaoId: permissao.id } },
      update: {},
      create: { papelId: papelFinanceiro.id, permissaoId: permissao.id },
    });
  }

  const emailAdmin = process.env.SEED_ADMIN_EMAIL ?? "admin@hgigroup.com.br";
  const senhaAdmin = process.env.SEED_ADMIN_PASSWORD ?? "TrocarSenha123!";

  console.log(`[seed] Garantindo usuário administrador inicial (${emailAdmin})...`);
  const senhaHash = await bcrypt.hash(senhaAdmin, 10);
  const usuarioAdmin = await prisma.usuario.upsert({
    where: { email: emailAdmin },
    update: {
      // Sempre atualiza a senha para garantir consistência com a variável
      // SEED_ADMIN_PASSWORD — evita situação em que o usuário existe mas
      // com um hash gerado numa execução anterior com senha diferente.
      // NÃO reseta precisaTrocarSenha aqui — senão toda vez que o seed
      // rodar de novo (ex: pra adicionar um papel novo), o Admin seria
      // forçado a trocar a senha de novo, o que é irritante em produção.
      senhaHash,
      ativo: true,
    },
    create: {
      nome: "Administrador",
      email: emailAdmin,
      senhaHash,
      ativo: true,
      precisaTrocarSenha: true,
    },
  });
  await prisma.usuarioPapel.upsert({
    where: { usuarioId_papelId: { usuarioId: usuarioAdmin.id, papelId: papelAdmin.id } },
    update: {},
    create: { usuarioId: usuarioAdmin.id, papelId: papelAdmin.id },
  });

  console.log("[seed] Concluído.");
  console.log(
    `[seed] Login inicial -> e-mail: ${emailAdmin} | senha: ${
      process.env.SEED_ADMIN_PASSWORD ? "(definida via SEED_ADMIN_PASSWORD)" : senhaAdmin
    }`
  );
  console.log(
    "[seed] IMPORTANTE: troque essa senha assim que possível, especialmente em produção."
  );

  await seedMateriaisPex();
  await seedMateriaisCatalogo();
  await seedOrcamentacao();
}

main()
  .catch((error) => {
    console.error("[seed] Erro ao executar seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function seedOrcamentacao() {
  console.log("[seed:orcamentacao] Inserindo tiers e tabela de precos base...");

  // Tiers — 4 níveis (0 a 3)
  const tiers = [
    { tier: 0, nome: "Tier 0 — Altissimo Padrao", multiplicador: 1.50 },
    { tier: 1, nome: "Tier 1 — Alto Padrao",      multiplicador: 1.20 },
    { tier: 2, nome: "Tier 2 — Medio Padrao",     multiplicador: 1.00 },
    { tier: 3, nome: "Tier 3 — Economico",        multiplicador: 0.80 },
  ];

  for (const t of tiers) {
    await prisma.tierMultiplicador.upsert({
      where: { tier: t.tier },
      create: { tier: t.tier, nome: t.nome, multiplicador: t.multiplicador },
      update: { nome: t.nome, multiplicador: t.multiplicador },
    });
  }

  // Tabela de precos base — faixas de area por kit
  // Valores de exemplo — Admin ajusta no módulo de Configuracoes
  const precos = [
    // Kit Elétrico
    { kit: "ELETRICO",   areaMin: 0,  areaMax: 45,  descricao: "Kit Eletrico — ate 45m²",    precoBase: 800 },
    { kit: "ELETRICO",   areaMin: 45, areaMax: 65,  descricao: "Kit Eletrico — 45 a 65m²",   precoBase: 1000 },
    { kit: "ELETRICO",   areaMin: 65, areaMax: 90,  descricao: "Kit Eletrico — 65 a 90m²",   precoBase: 1300 },
    { kit: "ELETRICO",   areaMin: 90, areaMax: 999, descricao: "Kit Eletrico — acima de 90m²", precoBase: 1600 },
    // Kit Hidráulico
    { kit: "HIDRAULICO", areaMin: 0,  areaMax: 45,  descricao: "Kit Hidraulico — ate 45m²",    precoBase: 500 },
    { kit: "HIDRAULICO", areaMin: 45, areaMax: 65,  descricao: "Kit Hidraulico — 45 a 65m²",   precoBase: 650 },
    { kit: "HIDRAULICO", areaMin: 65, areaMax: 90,  descricao: "Kit Hidraulico — 65 a 90m²",   precoBase: 850 },
    { kit: "HIDRAULICO", areaMin: 90, areaMax: 999, descricao: "Kit Hidraulico — acima de 90m²", precoBase: 1100 },
    // QDC
    { kit: "QDC",        areaMin: 0,  areaMax: 999, descricao: "Kit QDC — qualquer area",       precoBase: 400 },
  ];

  for (const p of precos) {
    const existing = await prisma.tabelaPrecoBase.findFirst({
      where: { kit: p.kit, areaMin: p.areaMin, areaMax: p.areaMax, criterio: "AREA" },
    });
    if (!existing) {
      await prisma.tabelaPrecoBase.create({ data: { ...p, criterio: "AREA" } });
    }
  }

  // O critério PONTOS_TETO deixou de usar faixas — virou fórmula única
  // (ver ConfiguracaoSistema.kitValorMinimo/kitPontosInclusos/
  // kitValorPorPontoExtra) — remove qualquer faixa antiga que tenha
  // sobrado de versões anteriores, não são mais usadas no cálculo.
  await prisma.tabelaPrecoBase.deleteMany({ where: { criterio: "PONTOS_TETO" } });

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      criterioPrecificacao: "AREA",
      kitValorMinimo: 550,
      kitPontosInclusos: 6,
      kitValorPorPontoExtra: 70,
    },
  });

  console.log("[seed:orcamentacao] Tiers e precos base inseridos.");
}
