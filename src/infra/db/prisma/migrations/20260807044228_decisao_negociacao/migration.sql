-- CreateTable
CREATE TABLE "decisoes_negociacao" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "decisao" TEXT NOT NULL,
    "cotacao_vencedora_id" TEXT,
    "observacoes" TEXT,
    "registrado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "decisoes_negociacao_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "decisoes_negociacao_empreendimento_id_idx" ON "decisoes_negociacao"("empreendimento_id");
-- AddForeignKey
ALTER TABLE "decisoes_negociacao" ADD CONSTRAINT "decisoes_negociacao_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "decisoes_negociacao" ADD CONSTRAINT "decisoes_negociacao_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
