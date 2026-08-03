/**
 * Migração pontual (28/07/2026) — concede EMPREENDIMENTO_VER_APENAS_PROPRIOS
 * só ao papel "Comercial", restringindo a listagem de Empreendimentos pra
 * cada vendedor ver só a própria carteira (não a dos colegas).
 *
 * Rodar uma vez: npx tsx src/infra/db/prisma/migrar-restricao-comercial.ts
 */
import { prisma } from "./client";
import { PERMISSOES } from "@/core/auth/permissions";

async function main() {
  const permissao = await prisma.permissao.findUniqueOrThrow({
    where: { chave: PERMISSOES.EMPREENDIMENTO_VER_APENAS_PROPRIOS },
  });

  const papelComercial = await prisma.papel.findFirst({
    where: { nome: { contains: "Comercial" } },
  });

  if (!papelComercial) {
    console.log('Nenhum papel com "Comercial" no nome foi encontrado — nada a fazer.');
    return;
  }

  await prisma.papelPermissao.upsert({
    where: { papelId_permissaoId: { papelId: papelComercial.id, permissaoId: permissao.id } },
    update: {},
    create: { papelId: papelComercial.id, permissaoId: permissao.id },
  });

  console.log(`Papel "${papelComercial.nome}": EMPREENDIMENTO_VER_APENAS_PROPRIOS concedida.`);
}

main()
  .catch((e) => {
    console.error("Erro na migração:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
