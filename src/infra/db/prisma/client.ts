import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma";

/**
 * Cliente Prisma (singleton) para todo o projeto.
 *
 * A partir do Prisma 7, o motor de conexão interno foi removido — é
 * obrigatório fornecer um "driver adapter" (aqui, @prisma/adapter-pg para
 * PostgreSQL) construído a partir de um pg.Pool real, e não apenas da
 * string de conexão.
 *
 * O padrão de variável global evita múltiplas instâncias/conexões durante
 * o hot-reload do Next.js em desenvolvimento.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
