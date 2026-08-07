-- AlterTable
ALTER TABLE "cotacoes" ADD COLUMN     "rodada_id" TEXT;
-- CreateTable
CREATE TABLE "rodadas_cotacao" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rodadas_cotacao_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "rodadas_cotacao_numero_key" ON "rodadas_cotacao"("numero");
-- CreateIndex
CREATE INDEX "rodadas_cotacao_orcamento_id_idx" ON "rodadas_cotacao"("orcamento_id");
-- AddForeignKey
ALTER TABLE "rodadas_cotacao" ADD CONSTRAINT "rodadas_cotacao_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_rodada_id_fkey" FOREIGN KEY ("rodada_id") REFERENCES "rodadas_cotacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
