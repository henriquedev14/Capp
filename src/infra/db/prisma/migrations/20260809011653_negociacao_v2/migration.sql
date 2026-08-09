-- AlterTable
ALTER TABLE "empresas_grupo" ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "estado" VARCHAR(2);

-- CreateTable
CREATE TABLE "interacoes_negociacao" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor_negociado" DECIMAL(12,2),
    "motivo_perda" TEXT,
    "cotacao_vencedora_id" TEXT,
    "observacoes" TEXT,
    "proxima_acao" TEXT,
    "proxima_acao_data" TIMESTAMP(3),
    "registrado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacoes_negociacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "empresa_grupo_id" TEXT NOT NULL,
    "cliente_razao_social" TEXT NOT NULL,
    "cliente_cnpj" TEXT NOT NULL,
    "cliente_endereco" TEXT,
    "cliente_cidade" TEXT,
    "cliente_estado" VARCHAR(2),
    "valor_final" DECIMAL(12,2) NOT NULL,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gerado_por_id" TEXT,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interacoes_negociacao_empreendimento_id_idx" ON "interacoes_negociacao"("empreendimento_id");

-- CreateIndex
CREATE INDEX "interacoes_negociacao_proxima_acao_data_idx" ON "interacoes_negociacao"("proxima_acao_data");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numero_key" ON "contratos"("numero");

-- CreateIndex
CREATE INDEX "contratos_empreendimento_id_idx" ON "contratos"("empreendimento_id");

-- AddForeignKey
ALTER TABLE "interacoes_negociacao" ADD CONSTRAINT "interacoes_negociacao_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes_negociacao" ADD CONSTRAINT "interacoes_negociacao_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresa_grupo_id_fkey" FOREIGN KEY ("empresa_grupo_id") REFERENCES "empresas_grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_gerado_por_id_fkey" FOREIGN KEY ("gerado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
