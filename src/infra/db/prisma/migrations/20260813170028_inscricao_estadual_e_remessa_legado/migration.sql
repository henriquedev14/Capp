/*
  Warnings:

  - A unique constraint covering the columns `[conta_receber_remessa_id]` on the table `kits_legado` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "inscricao_estadual" TEXT;

-- AlterTable
ALTER TABLE "kits_legado" ADD COLUMN     "conta_receber_remessa_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "kits_legado_conta_receber_remessa_id_key" ON "kits_legado"("conta_receber_remessa_id");

-- AddForeignKey
ALTER TABLE "kits_legado" ADD CONSTRAINT "kits_legado_conta_receber_remessa_id_fkey" FOREIGN KEY ("conta_receber_remessa_id") REFERENCES "contas_receber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
