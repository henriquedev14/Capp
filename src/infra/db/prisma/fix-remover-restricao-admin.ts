/**
 * Correção urgente (28/07/2026) — a seed script concede "todas as
 * permissões" pro Admin automaticamente, o que incluiu por engano
 * EMPREENDIMENTO_VER_APENAS_PROPRIOS (uma permissão de RESTRIÇÃO, não
 * uma capacidade — não devia nunca ir pro Admin). Efeito colateral:
 * Admin passou a ver 0 empreendimentos, como se o banco tivesse sido
 * apagado (não foi — os dados continuam intactos).
 *
 * Rodar uma vez: npx tsx src/infra/db/prisma/fix-remover-restricao-admin.ts
 */
import { prisma } from "./client";
import { PERMISSOES } from "@/core/auth/permissions";

async function main() {
  const permissao = await prisma.permissao.findUniqueOrThrow({
    where: { chave: PERMISSOES.EMPREENDIMENTO_VER_APENAS_PROPRIOS },
  });

  const papelAdmin = await prisma.papel.findFirst({ where: { nome: "Admin" } });
  if (!papelAdmin) {
    console.log('Papel "Admin" não encontrado.');
    return;
  }

  const removido = await prisma.papelPermissao.deleteMany({
    where: { papelId: papelAdmin.id, permissaoId: permissao.id },
  });

  console.log(`Removidas ${removido.count} concessão(ões) de EMPREENDIMENTO_VER_APENAS_PROPRIOS do papel Admin.`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
