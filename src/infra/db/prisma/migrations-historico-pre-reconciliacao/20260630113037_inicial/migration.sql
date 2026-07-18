-- CreateEnum
CREATE TYPE "StatusEmpreendimento" AS ENUM ('PROSPECCAO', 'COMERCIAL', 'CONTRATADO', 'SUPRIMENTOS', 'PRODUCAO', 'CONCLUIDO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('MUDANCA_STATUS', 'ANOTACAO', 'DOCUMENTO');

-- CreateEnum
CREATE TYPE "TipoEmpreendimento" AS ENUM ('RESIDENCIAL_VERTICAL', 'RESIDENCIAL_HORIZONTAL', 'COMERCIAL', 'INDUSTRIAL', 'INFRAESTRUTURA', 'LOTEAMENTO');

-- CreateEnum
CREATE TYPE "TipoEstrutura" AS ENUM ('CONCRETO_ARMADO', 'ALVENARIA_ESTRUTURAL', 'PAREDE_DE_CONCRETO', 'ESTRUTURA_METALICA', 'STEEL_FRAME', 'WOOD_FRAME');

-- CreateEnum
CREATE TYPE "TierCliente" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "logradouro" TEXT,
    "cidade" TEXT,
    "estado" VARCHAR(2),
    "cep" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tier" "TierCliente",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_contatos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empreendimentos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" VARCHAR(2) NOT NULL,
    "endereco" TEXT NOT NULL,
    "tipo" "TipoEmpreendimento" NOT NULL,
    "construtora" TEXT NOT NULL,
    "incorporadora" TEXT,
    "tipo_estrutura" "TipoEstrutura",
    "metodo_construtivo" TEXT,
    "tipo_laje" TEXT,
    "tipo_vedacao" TEXT,
    "responsavel_comercial" TEXT NOT NULL,
    "status" "StatusEmpreendimento" NOT NULL DEFAULT 'PROSPECCAO',
    "data_prevista_inicio" TIMESTAMP(3),
    "data_prevista_entrega" TIMESTAMP(3),
    "valor_estimado" DECIMAL(14,2),
    "responsavel_comercial_user_id" TEXT,
    "responsavel_engenharia_user_id" TEXT,
    "responsavel_orcamentacao_user_id" TEXT,
    "observacoes" TEXT,
    "tem_hall" BOOLEAN NOT NULL DEFAULT false,
    "kit_eletrico" BOOLEAN NOT NULL DEFAULT false,
    "kit_hidraulico" BOOLEAN NOT NULL DEFAULT false,
    "kit_qdc" BOOLEAN NOT NULL DEFAULT false,
    "excluido_em" TIMESTAMP(3),
    "excluido_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empreendimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "torres" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "torres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocos" (
    "id" TEXT NOT NULL,
    "torre_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pavimentos" (
    "id" TEXT NOT NULL,
    "bloco_id" TEXT,
    "torre_id" TEXT,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pavimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "pavimento_id" TEXT NOT NULL,
    "identificacao" TEXT NOT NULL,
    "tipologia_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipologias" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "area_privativa" DECIMAL(8,2),
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipologias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "eventos_empreendimento" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "usuario_id" TEXT,
    "meta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_empreendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_empreendimento" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tamanho" INTEGER,
    "tipo" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_empreendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papeis" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "papeis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_papeis" (
    "usuario_id" TEXT NOT NULL,
    "papel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_papeis_pkey" PRIMARY KEY ("usuario_id","papel_id")
);

-- CreateTable
CREATE TABLE "papeis_permissoes" (
    "papel_id" TEXT NOT NULL,
    "permissao_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "papeis_permissoes_pkey" PRIMARY KEY ("papel_id","permissao_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_codigo_key" ON "clientes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE INDEX "clientes_cnpj_idx" ON "clientes"("cnpj");

-- CreateIndex
CREATE INDEX "clientes_ativo_idx" ON "clientes"("ativo");

-- CreateIndex
CREATE INDEX "clientes_tier_idx" ON "clientes"("tier");

-- CreateIndex
CREATE INDEX "cliente_contatos_cliente_id_idx" ON "cliente_contatos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "empreendimentos_codigo_key" ON "empreendimentos"("codigo");

-- CreateIndex
CREATE INDEX "empreendimentos_cliente_id_idx" ON "empreendimentos"("cliente_id");

-- CreateIndex
CREATE INDEX "empreendimentos_status_idx" ON "empreendimentos"("status");

-- CreateIndex
CREATE INDEX "empreendimentos_responsavel_comercial_user_id_idx" ON "empreendimentos"("responsavel_comercial_user_id");

-- CreateIndex
CREATE INDEX "empreendimentos_responsavel_engenharia_user_id_idx" ON "empreendimentos"("responsavel_engenharia_user_id");

-- CreateIndex
CREATE INDEX "empreendimentos_responsavel_orcamentacao_user_id_idx" ON "empreendimentos"("responsavel_orcamentacao_user_id");

-- CreateIndex
CREATE INDEX "torres_empreendimento_id_idx" ON "torres"("empreendimento_id");

-- CreateIndex
CREATE INDEX "blocos_torre_id_idx" ON "blocos"("torre_id");

-- CreateIndex
CREATE INDEX "pavimentos_bloco_id_idx" ON "pavimentos"("bloco_id");

-- CreateIndex
CREATE INDEX "pavimentos_torre_id_idx" ON "pavimentos"("torre_id");

-- CreateIndex
CREATE INDEX "unidades_pavimento_id_idx" ON "unidades"("pavimento_id");

-- CreateIndex
CREATE INDEX "unidades_tipologia_id_idx" ON "unidades"("tipologia_id");

-- CreateIndex
CREATE INDEX "tipologias_empreendimento_id_idx" ON "tipologias"("empreendimento_id");

-- CreateIndex
CREATE INDEX "eventos_empreendimento_empreendimento_id_idx" ON "eventos_empreendimento"("empreendimento_id");

-- CreateIndex
CREATE INDEX "eventos_empreendimento_created_at_idx" ON "eventos_empreendimento"("created_at");

-- CreateIndex
CREATE INDEX "documentos_empreendimento_empreendimento_id_idx" ON "documentos_empreendimento"("empreendimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "papeis_nome_key" ON "papeis"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_chave_key" ON "permissoes"("chave");

-- CreateIndex
CREATE INDEX "usuarios_papeis_papel_id_idx" ON "usuarios_papeis"("papel_id");

-- CreateIndex
CREATE INDEX "papeis_permissoes_permissao_id_idx" ON "papeis_permissoes"("permissao_id");

-- AddForeignKey
ALTER TABLE "eventos_empreendimento" ADD CONSTRAINT "eventos_empreendimento_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_empreendimento" ADD CONSTRAINT "eventos_empreendimento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_empreendimento" ADD CONSTRAINT "documentos_empreendimento_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_empreendimento" ADD CONSTRAINT "documentos_empreendimento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_contatos" ADD CONSTRAINT "cliente_contatos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreendimentos" ADD CONSTRAINT "empreendimentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreendimentos" ADD CONSTRAINT "empreendimentos_responsavel_comercial_user_id_fkey" FOREIGN KEY ("responsavel_comercial_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreendimentos" ADD CONSTRAINT "empreendimentos_responsavel_engenharia_user_id_fkey" FOREIGN KEY ("responsavel_engenharia_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreendimentos" ADD CONSTRAINT "empreendimentos_responsavel_orcamentacao_user_id_fkey" FOREIGN KEY ("responsavel_orcamentacao_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torres" ADD CONSTRAINT "torres_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocos" ADD CONSTRAINT "blocos_torre_id_fkey" FOREIGN KEY ("torre_id") REFERENCES "torres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pavimentos" ADD CONSTRAINT "pavimentos_bloco_id_fkey" FOREIGN KEY ("bloco_id") REFERENCES "blocos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pavimentos" ADD CONSTRAINT "pavimentos_torre_id_fkey" FOREIGN KEY ("torre_id") REFERENCES "torres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_pavimento_id_fkey" FOREIGN KEY ("pavimento_id") REFERENCES "pavimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_papeis" ADD CONSTRAINT "usuarios_papeis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_papeis" ADD CONSTRAINT "usuarios_papeis_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papeis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papeis_permissoes" ADD CONSTRAINT "papeis_permissoes_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papeis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papeis_permissoes" ADD CONSTRAINT "papeis_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
