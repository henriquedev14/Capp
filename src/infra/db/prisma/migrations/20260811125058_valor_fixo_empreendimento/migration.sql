-- AlterEnum
ALTER TYPE "CriterioPrecificacao" ADD VALUE 'VALOR_FIXO';

-- AlterTable
ALTER TABLE "empreendimentos" ADD COLUMN     "preco_fixo_eletrico" DECIMAL(10,2),
ADD COLUMN     "preco_fixo_hidraulico" DECIMAL(10,2),
ADD COLUMN     "preco_fixo_qdc" DECIMAL(10,2);
