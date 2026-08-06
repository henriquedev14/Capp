/**
 * Migração pontual (05/08/2026) — concede DASHBOARD_VER_PRODUTIVIDADE
 * ao papel "Coordenador", pra ele ver a Central de Produtividade.
 * Admin já ganha automaticamente (permissão normal, não é do tipo
 * restrição que fica de fora da lista de exceção da seed).
 *
 * Rodar uma vez: npx tsx src/infra/db/prisma/migrar-permissao-produtividade.ts
 */
import { prisma } from "./client";
import { PERMISSOES } from "@/core/auth/permissions";

async function main() {
  const permissao = await prisma.permissao.findUniqueOrThrow({
    where: { chave: PERMISSOES.DASHBOARD_VER_PRODUTIVIDADE },
  });

  const papelCoordenador = await prisma.papel.findFirst({
    where: { nome: { contains: "Coordenador" } },
  });

  if (!papelCoordenador) {
    console.log('Nenhum papel com "Coordenador" no nome foi encontrado — nada a fazer.');
    return;
  }

  await prisma.papelPermissao.upsert({
    where: { papelId_permissaoId: { papelId: papelCoordenador.id, permissaoId: permissao.id } },
    update: {},
    create: { papelId: papelCoordenador.id, permissaoId: permissao.id },
  });

  console.log(`Papel "${papelCoordenador.nome}": DASHBOARD_VER_PRODUTIVIDADE concedida.`);
}

main()
  .catch((e) => {
    console.error("Erro na migração:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
