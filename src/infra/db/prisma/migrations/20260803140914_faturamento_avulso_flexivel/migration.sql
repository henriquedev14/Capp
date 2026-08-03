-- AlterTable
ALTER TABLE "contas_receber" ADD COLUMN     "nome_avulso" TEXT,
ALTER COLUMN "empreendimento_id" DROP NOT NULL;
