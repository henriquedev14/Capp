-- AlterTable
ALTER TABLE "empreendimentos" ADD COLUMN     "origem_legado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "itens_tabela_preco" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "kits_legado" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "kit" TEXT NOT NULL,
    "quantidade_total" INTEGER NOT NULL,
    "valor_contrato" DECIMAL(12,2) NOT NULL,
    "quantidade_entregue_inicial" INTEGER NOT NULL DEFAULT 0,
    "valor_faturado_inicial" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tipologia_id" TEXT,
    "ordem_producao_id" TEXT,
    "conta_receber_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kits_legado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kits_legado_tipologia_id_key" ON "kits_legado"("tipologia_id");

-- CreateIndex
CREATE UNIQUE INDEX "kits_legado_ordem_producao_id_key" ON "kits_legado"("ordem_producao_id");

-- CreateIndex
CREATE UNIQUE INDEX "kits_legado_conta_receber_id_key" ON "kits_legado"("conta_receber_id");

-- CreateIndex
CREATE UNIQUE INDEX "kits_legado_empreendimento_id_kit_key" ON "kits_legado"("empreendimento_id", "kit");

-- AddForeignKey
ALTER TABLE "kits_legado" ADD CONSTRAINT "kits_legado_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits_legado" ADD CONSTRAINT "kits_legado_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits_legado" ADD CONSTRAINT "kits_legado_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordens_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits_legado" ADD CONSTRAINT "kits_legado_conta_receber_id_fkey" FOREIGN KEY ("conta_receber_id") REFERENCES "contas_receber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
