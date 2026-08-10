-- AlterTable
ALTER TABLE "empreendimentos" ADD COLUMN     "tomou_propriedade_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orcamentos" ADD COLUMN     "enviado_aprovacao_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "logs_movimentacao_orcamento" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_movimentacao_orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_movimentacao_orcamento_empreendimento_id_idx" ON "logs_movimentacao_orcamento"("empreendimento_id");

-- AddForeignKey
ALTER TABLE "logs_movimentacao_orcamento" ADD CONSTRAINT "logs_movimentacao_orcamento_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_movimentacao_orcamento" ADD CONSTRAINT "logs_movimentacao_orcamento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
