-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "boletoConteudo" BYTEA,
ADD COLUMN     "boletoNome" TEXT,
ADD COLUMN     "boletoTamanho" INTEGER,
ADD COLUMN     "boletoTipo" TEXT;

-- AlterTable
ALTER TABLE "contas_receber" ADD COLUMN     "boletoConteudo" BYTEA,
ADD COLUMN     "boletoNome" TEXT,
ADD COLUMN     "boletoTamanho" INTEGER,
ADD COLUMN     "boletoTipo" TEXT;

-- CreateTable
CREATE TABLE "precos_fixos_tipologia" (
    "id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "kit" TEXT NOT NULL,
    "valor_unitario" DECIMAL(10,2) NOT NULL,
    "observacoes" TEXT,
    "definido_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precos_fixos_tipologia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "precos_fixos_tipologia_tipologia_id_kit_key" ON "precos_fixos_tipologia"("tipologia_id", "kit");

-- AddForeignKey
ALTER TABLE "precos_fixos_tipologia" ADD CONSTRAINT "precos_fixos_tipologia_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precos_fixos_tipologia" ADD CONSTRAINT "precos_fixos_tipologia_definido_por_id_fkey" FOREIGN KEY ("definido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
