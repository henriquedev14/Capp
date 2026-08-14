/*
  Warnings:

  - You are about to drop the column `conta_receber_id` on the `kits_legado` table. All the data in the column will be lost.
  - You are about to drop the column `conta_receber_remessa_id` on the `kits_legado` table. All the data in the column will be lost.
  - You are about to drop the column `quantidade_entregue_inicial` on the `kits_legado` table. All the data in the column will be lost.
  - You are about to drop the column `quantidade_total` on the `kits_legado` table. All the data in the column will be lost.
  - You are about to drop the column `valor_contrato` on the `kits_legado` table. All the data in the column will be lost.
  - You are about to drop the column `valor_faturado_inicial` on the `kits_legado` table. All the data in the column will be lost.
  - Added the required column `quantidade_contratada` to the `kits_legado` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "kits_legado" DROP CONSTRAINT "kits_legado_conta_receber_id_fkey";

-- DropForeignKey
ALTER TABLE "kits_legado" DROP CONSTRAINT "kits_legado_conta_receber_remessa_id_fkey";

-- DropIndex
DROP INDEX "kits_legado_conta_receber_id_key";

-- DropIndex
DROP INDEX "kits_legado_conta_receber_remessa_id_key";

-- AlterTable
ALTER TABLE "empreendimentos" ADD COLUMN     "legado_faturado_historico" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "legado_quantidade_base_unidades" INTEGER,
ADD COLUMN     "legado_recebido_historico" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "legado_valor_contratado" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "kits_legado" DROP COLUMN "conta_receber_id",
DROP COLUMN "conta_receber_remessa_id",
DROP COLUMN "quantidade_entregue_inicial",
DROP COLUMN "quantidade_total",
DROP COLUMN "valor_contrato",
DROP COLUMN "valor_faturado_inicial",
ADD COLUMN     "quantidade_contratada" INTEGER NOT NULL,
ADD COLUMN     "quantidade_entregue_historico" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantidade_produzida_historico" INTEGER,
ADD COLUMN     "valor_contrato_especifico" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "tipologias" ADD COLUMN     "tecnica" BOOLEAN NOT NULL DEFAULT false;
