import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Configuração do Prisma ORM (v7+).
 *
 * O schema vive em src/infra/db/prisma/schema.prisma — e não na raiz —
 * porque, na arquitetura deste projeto, tudo que conhece detalhes de
 * infraestrutura (banco de dados, storage, autenticação) fica isolado
 * dentro de src/infra/. Isso mantém o restante do código (core/, features/)
 * sem nenhuma dependência direta de "onde" ou "como" os dados são persistidos.
 *
 * IMPORTANTE: usamos `process.env.DATABASE_URL` diretamente (e não o helper
 * `env()` do Prisma) de propósito. O helper `env()` lança erro imediato se a
 * variável não existir — e isso quebraria `npx prisma generate` durante o
 * build da imagem Docker, etapa em que DATABASE_URL ainda não está
 * definida (ela só é injetada em runtime pelo docker-compose.yml).
 */
export default defineConfig({
  schema: "src/infra/db/prisma/schema.prisma",
  migrations: {
    path: "src/infra/db/prisma/migrations",
    seed: "tsx src/infra/db/prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
    // Usado só por `prisma migrate diff --from-migrations` durante o teste
    // de reconciliação — precisa de um banco descartável separado do banco
    // real pra "replayar" as migrations em sequência sem tocar em nada de
    // produção. Ausente em qualquer outro contexto (build, runtime normal
    // da aplicação, db push, etc.) não quebra nada — só incluímos a chave
    // quando a env var realmente existe, porque o Prisma 7 passou a validar
    // shadowDatabaseUrl mesmo em comandos que não a usam, e rejeita string
    // vazia (erro P1013).
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});
