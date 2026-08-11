-- AlterTable
ALTER TABLE "configuracao_sistema" ADD COLUMN     "preco_fixo_eletrico" DECIMAL(10,2),
ADD COLUMN     "preco_fixo_hidraulico" DECIMAL(10,2),
ADD COLUMN     "preco_fixo_qdc" DECIMAL(10,2);
