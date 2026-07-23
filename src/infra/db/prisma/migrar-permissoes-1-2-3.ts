/**
 * Migração pontual da Tarefa 1.2.3 (RBAC granular).
 *
 * Antes desta tarefa, "aplicar preço no orçamento" usava
 * EMPREENDIMENTO_EDITAR, e "gerenciar Tabela de Preços" usava
 * FORNECEDOR_EDITAR — permissões amplas demais pra ações financeiras
 * sensíveis. Agora existem permissões dedicadas
 * (ORCAMENTO_APLICAR_PRECO e FORNECEDOR_GERENCIAR_PRECOS).
 *
 * Este script garante que nenhum papel que já tinha a permissão ampla
 * perca a capacidade de fazer o que já fazia — concede a permissão nova
 * automaticamente pra todo papel que já tinha a antiga. Depois de rodar,
 * um Admin pode revisar em Papéis e refinar manualmente se quiser
 * separar de verdade (ex: um papel de "Comercial" que só devia editar
 * empreendimento, não aplicar preço).
 *
 * Rodar uma vez só, via: npx tsx src/infra/db/prisma/migrar-permissoes-1-2-3.ts
 */
import { prisma } from "./client";
import { PERMISSOES } from "@/core/auth/permissions";

async function main() {
  const [permOrcamentoAplicarPreco, permFornecedorGerenciarPrecos] = await Promise.all([
    prisma.permissao.findUniqueOrThrow({ where: { chave: PERMISSOES.ORCAMENTO_APLICAR_PRECO } }),
    prisma.permissao.findUniqueOrThrow({ where: { chave: PERMISSOES.FORNECEDOR_GERENCIAR_PRECOS } }),
  ]);

  const papeisComEmpreendimentoEditar = await prisma.papel.findMany({
    where: { permissoes: { some: { permissao: { chave: PERMISSOES.EMPREENDIMENTO_EDITAR } } } },
    select: { id: true, nome: true },
  });

  const papeisComFornecedorEditar = await prisma.papel.findMany({
    where: { permissoes: { some: { permissao: { chave: PERMISSOES.FORNECEDOR_EDITAR } } } },
    select: { id: true, nome: true },
  });

  let concedidas = 0;

  for (const papel of papeisComEmpreendimentoEditar) {
    const resultado = await prisma.papelPermissao.upsert({
      where: { papelId_permissaoId: { papelId: papel.id, permissaoId: permOrcamentoAplicarPreco.id } },
      update: {},
      create: { papelId: papel.id, permissaoId: permOrcamentoAplicarPreco.id },
    });
    console.log(`  Papel "${papel.nome}": ORCAMENTO_APLICAR_PRECO garantida.`);
    concedidas++;
  }

  for (const papel of papeisComFornecedorEditar) {
    await prisma.papelPermissao.upsert({
      where: { papelId_permissaoId: { papelId: papel.id, permissaoId: permFornecedorGerenciarPrecos.id } },
      update: {},
      create: { papelId: papel.id, permissaoId: permFornecedorGerenciarPrecos.id },
    });
    console.log(`  Papel "${papel.nome}": FORNECEDOR_GERENCIAR_PRECOS garantida.`);
    concedidas++;
  }

  console.log(`\nMigração concluída. ${concedidas} concessões processadas (upsert — seguro rodar mais de uma vez).`);
}

main()
  .catch((e) => {
    console.error("Erro na migração:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
