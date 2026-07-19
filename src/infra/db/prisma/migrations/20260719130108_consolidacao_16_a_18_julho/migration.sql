/*
  Warnings:

  - A unique constraint covering the columns `[conta_fixa_modelo_id,ano_referencia,mes_referencia]` on the table `contas_pagar` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[codigo]` on the table `materiais_eletrico` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "ano_referencia" INTEGER,
ADD COLUMN     "mes_referencia" INTEGER;

-- AlterTable
ALTER TABLE "itens_levantamento_material" ADD COLUMN     "categoria" TEXT;

-- AlterTable
ALTER TABLE "itens_material_orcamento" ADD COLUMN     "item_tabela_preco_id" TEXT,
ADD COLUMN     "marca" TEXT;

-- AlterTable
ALTER TABLE "materiais_eletrico" ADD COLUMN     "codigo" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "telefone" TEXT;

-- CreateTable
CREATE TABLE "tabelas_preco_fornecedor" (
    "id" TEXT NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "vigencia_inicio" TIMESTAMP(3) NOT NULL,
    "vigencia_fim" TIMESTAMP(3) NOT NULL,
    "data_importacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_importacao_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tabelas_preco_fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_tabela_preco" (
    "id" TEXT NOT NULL,
    "tabela_id" TEXT NOT NULL,
    "material_eletrico_id" TEXT,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "valor_unitario" DECIMAL(10,4) NOT NULL,
    "marca" TEXT NOT NULL,
    "prazo_entrega" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_tabela_preco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tabelas_preco_fornecedor_fornecedor_id_idx" ON "tabelas_preco_fornecedor"("fornecedor_id");

-- CreateIndex
CREATE INDEX "tabelas_preco_fornecedor_fornecedor_id_status_idx" ON "tabelas_preco_fornecedor"("fornecedor_id", "status");

-- CreateIndex
CREATE INDEX "itens_tabela_preco_tabela_id_idx" ON "itens_tabela_preco"("tabela_id");

-- CreateIndex
CREATE INDEX "itens_tabela_preco_material_eletrico_id_idx" ON "itens_tabela_preco"("material_eletrico_id");

-- CreateIndex
CREATE UNIQUE INDEX "contas_pagar_conta_fixa_modelo_id_ano_referencia_mes_refere_key" ON "contas_pagar"("conta_fixa_modelo_id", "ano_referencia", "mes_referencia");

-- CreateIndex
CREATE UNIQUE INDEX "materiais_eletrico_codigo_key" ON "materiais_eletrico"("codigo");

-- AddForeignKey
ALTER TABLE "itens_material_orcamento" ADD CONSTRAINT "itens_material_orcamento_item_tabela_preco_id_fkey" FOREIGN KEY ("item_tabela_preco_id") REFERENCES "itens_tabela_preco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabelas_preco_fornecedor" ADD CONSTRAINT "tabelas_preco_fornecedor_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabelas_preco_fornecedor" ADD CONSTRAINT "tabelas_preco_fornecedor_usuario_importacao_id_fkey" FOREIGN KEY ("usuario_importacao_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_tabela_preco" ADD CONSTRAINT "itens_tabela_preco_tabela_id_fkey" FOREIGN KEY ("tabela_id") REFERENCES "tabelas_preco_fornecedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_tabela_preco" ADD CONSTRAINT "itens_tabela_preco_material_eletrico_id_fkey" FOREIGN KEY ("material_eletrico_id") REFERENCES "materiais_eletrico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
