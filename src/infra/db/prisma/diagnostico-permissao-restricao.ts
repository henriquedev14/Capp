import { prisma } from "./client";
import { PERMISSOES } from "@/core/auth/permissions";

async function main() {
  const permissao = await prisma.permissao.findUnique({
    where: { chave: PERMISSOES.EMPREENDIMENTO_VER_APENAS_PROPRIOS },
    include: { papeis: { include: { papel: true } } },
  });

  if (!permissao) {
    console.log("Permissão EMPREENDIMENTO_VER_APENAS_PROPRIOS não existe no banco ainda.");
    return;
  }

  console.log("Papéis com essa permissão:");
  for (const pp of permissao.papeis) {
    console.log(` - ${pp.papel.nome}`);
  }
  if (permissao.papeis.length === 0) console.log(" (nenhum)");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
