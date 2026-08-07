/**
 * Preenche o nome exibido nos documentos (PDF/CSV de Cotação), já que
 * o registro "default" de ConfiguracaoSistema já existe em produção e
 * a seed (update: {}) não sobrescreve valores existentes.
 *
 * Rodar uma vez: npx tsx src/infra/db/prisma/preencher-identidade-documentos.ts
 */
import { prisma } from "./client";

async function main() {
  const atualizado = await prisma.configuracaoSistema.update({
    where: { id: "default" },
    data: { nomeEmpresaDocumentos: "ConstruApp by Grupo HGI" },
  });
  console.log(`Nome nos documentos definido como: "${atualizado.nomeEmpresaDocumentos}"`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
