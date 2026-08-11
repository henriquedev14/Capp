-- CreateEnum
CREATE TYPE "StatusOrdemProducao" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'PAUSADA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "PrioridadeOrdemProducao" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateTable
CREATE TABLE "ordens_producao" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "bancada_id" TEXT NOT NULL,
    "quantidade_alvo" INTEGER NOT NULL,
    "quantidade_aprovada" INTEGER NOT NULL DEFAULT 0,
    "quantidade_retrabalho" INTEGER NOT NULL DEFAULT 0,
    "quantidade_perda" INTEGER NOT NULL DEFAULT 0,
    "prioridade" "PrioridadeOrdemProducao" NOT NULL DEFAULT 'MEDIA',
    "prazo" TIMESTAMP(3),
    "status" "StatusOrdemProducao" NOT NULL DEFAULT 'PENDENTE',
    "tempo_total_segundos" INTEGER NOT NULL DEFAULT 0,
    "operador_atual_id" TEXT,
    "iniciada_em" TIMESTAMP(3),
    "finalizada_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordens_producao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pausas_ordem_producao" (
    "id" TEXT NOT NULL,
    "ordem_producao_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),

    CONSTRAINT "pausas_ordem_producao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ordens_producao_numero_key" ON "ordens_producao"("numero");

-- CreateIndex
CREATE INDEX "ordens_producao_bancada_id_status_idx" ON "ordens_producao"("bancada_id", "status");

-- CreateIndex
CREATE INDEX "ordens_producao_tipologia_id_idx" ON "ordens_producao"("tipologia_id");

-- CreateIndex
CREATE INDEX "pausas_ordem_producao_ordem_producao_id_idx" ON "pausas_ordem_producao"("ordem_producao_id");

-- AddForeignKey
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_bancada_id_fkey" FOREIGN KEY ("bancada_id") REFERENCES "bancadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_operador_atual_id_fkey" FOREIGN KEY ("operador_atual_id") REFERENCES "operadores_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pausas_ordem_producao" ADD CONSTRAINT "pausas_ordem_producao_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordens_producao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
