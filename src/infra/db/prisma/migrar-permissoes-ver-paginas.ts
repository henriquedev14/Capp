/**
 * Migração pontual — achado durante criação do papel "Produção"
 * (24/07/2026): 8 páginas principais não tinham NENHUMA checagem de
 * permissão (Pessoas, Papéis, Orçamentação, Expedição, Clientes,
 * Empreendimentos, Fornecedores, Financeiro). Como consequência, o menu
 * lateral também não filtrava por permissão nenhuma.
 *
 * Esse script garante que todo papel JÁ EXISTENTE (menos o "Produção",
 * que é o próprio motivo de existir dessa proteção) ganhe as 2
 * permissões novas que não existiam antes — ORCAMENTO_VER e
 * EXPEDICAO_VER. As outras permissões usadas nos gates (CLIENTE_VER,
 * EMPREENDIMENTO_VER, FORNECEDOR_VER, FINANCEIRO_VER,
 * ADMIN_GERENCIAR_USUARIOS, ADMIN_GERENCIAR_PAPEIS) já existiam antes e
 * presumivelmente já estão atribuídas a quem precisa.
 *
 * Rodar uma vez: npx tsx src/infra/db/prisma/migrar-permissoes-ver-paginas.ts
 */
import { prisma } from "./client";
import { PERMISSOES } from "@/core/auth/permissions";

async function main() {
  const [permOrcamentoVer, permExpedicaoVer] = await Promise.all([
    prisma.permissao.findUniqueOrThrow({ where: { chave: PERMISSOES.ORCAMENTO_VER } }),
    prisma.permissao.findUniqueOrThrow({ where: { chave: PERMISSOES.EXPEDICAO_VER } }),
  ]);

  const papeis = await prisma.papel.findMany({
    where: { nome: { not: { contains: "Produção" } } },
    select: { id: true, nome: true },
  });

  let concedidas = 0;
  for (const papel of papeis) {
    await prisma.papelPermissao.upsert({
      where: { papelId_permissaoId: { papelId: papel.id, permissaoId: permOrcamentoVer.id } },
      update: {},
      create: { papelId: papel.id, permissaoId: permOrcamentoVer.id },
    });
    await prisma.papelPermissao.upsert({
      where: { papelId_permissaoId: { papelId: papel.id, permissaoId: permExpedicaoVer.id } },
      update: {},
      create: { papelId: papel.id, permissaoId: permExpedicaoVer.id },
    });
    console.log(`  Papel "${papel.nome}": ORCAMENTO_VER + EXPEDICAO_VER garantidas.`);
    concedidas += 2;
  }

  console.log(`\nMigração concluída. ${concedidas} concessões processadas em ${papeis.length} papéis (upsert — seguro rodar mais de uma vez).`);
  console.log(`Papel "Produção" foi deliberadamente EXCLUÍDO dessa migração — é o motivo da proteção existir.`);
}

main()
  .catch((e) => {
    console.error("Erro na migração:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
