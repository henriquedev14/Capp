CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusEmpreendimento" AS ENUM ('PROSPECCAO', 'COMERCIAL', 'ORCAMENTACAO', 'NEGOCIACAO', 'CONTRATADO', 'SUPRIMENTOS', 'PRODUCAO', 'CONCLUIDO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('MUDANCA_STATUS', 'ANOTACAO', 'DOCUMENTO');

-- CreateEnum
CREATE TYPE "TipoEmpreendimento" AS ENUM ('RESIDENCIAL_VERTICAL', 'RESIDENCIAL_HORIZONTAL', 'COMERCIAL', 'INDUSTRIAL', 'INFRAESTRUTURA', 'LOTEAMENTO');

-- CreateEnum
CREATE TYPE "TipoEstrutura" AS ENUM ('CONCRETO_ARMADO', 'ALVENARIA_ESTRUTURAL', 'PAREDE_DE_CONCRETO', 'ESTRUTURA_METALICA', 'STEEL_FRAME', 'WOOD_FRAME');

-- CreateEnum
CREATE TYPE "StatusProducaoTipologia" AS ENUM ('ATIVA', 'STANDBY', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "CriterioPrecificacao" AS ENUM ('AREA', 'PONTOS_TETO');

-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('EM_LEVANTAMENTO', 'ENVIADO_APROVACAO_GESTOR', 'ORCAMENTO_APROVADO', 'ORCAMENTO_DEVOLVIDO');

-- CreateEnum
CREATE TYPE "SubtipoHidraulico" AS ENUM ('ESGOTO', 'PEX', 'AGUA_QUENTE', 'AGUA_FRIA');

-- CreateEnum
CREATE TYPE "TipoEletroduto" AS ENUM ('LAJE', 'VERTICAL', 'PISO');

-- CreateEnum
CREATE TYPE "TipoFornecedor" AS ENUM ('ELETRODUTOS', 'CABOS', 'QUADROS', 'LUMINARIAS', 'TOMADAS_INTERRUPTORES', 'MATERIAIS_HIDRAULICOS', 'MATERIAIS_CIVIS', 'FERRAMENTAS', 'SERVICOS', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusCotacao" AS ENUM ('RASCUNHO', 'ENVIADA', 'RESPONDIDA', 'ACEITA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "ComportamentoCusto" AS ENUM ('FIXO', 'SEMIFIXO', 'VARIAVEL');

-- CreateEnum
CREATE TYPE "NaturezaGasto" AS ENUM ('CUSTO', 'DESPESA');

-- CreateEnum
CREATE TYPE "ApropriacaoGasto" AS ENUM ('DIRETO', 'INDIRETO');

-- CreateEnum
CREATE TYPE "TipoContaPagar" AS ENUM ('FIXA', 'PARCELADA', 'AVULSA');

-- CreateEnum
CREATE TYPE "TipoContaReceber" AS ENUM ('ENTRADA', 'REMESSA');

-- CreateEnum
CREATE TYPE "TipoLogSeguranca" AS ENUM ('LOGIN_SUCESSO', 'LOGIN_FALHA', 'LOGIN_BLOQUEADO', 'PERMISSAO_NEGADA', 'SENHA_RESET_SOLICITADO', 'SENHA_RESET_CONCLUIDO', 'DUPLO_FATOR_ATIVADO', 'DUPLO_FATOR_DESATIVADO', 'DUPLO_FATOR_FALHA', 'LOGOUT_INATIVIDADE', 'SESSAO_ANTERIOR_ENCERRADA');

-- CreateEnum
CREATE TYPE "UnidadeMedidaBancada" AS ENUM ('METROS', 'PECAS');

-- CreateEnum
CREATE TYPE "TipoCalculoBancada" AS ENUM ('CABO', 'ELETRODUTO', 'CONTAGEM');

-- CreateEnum
CREATE TYPE "TurnoProducao" AS ENUM ('MANHA', 'TARDE', 'NOITE');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoEstoque" AS ENUM ('ENTRADA', 'SAIDA_PRODUCAO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EtapaOperacional" AS ENUM ('LEVANTAMENTO_ELETRICO_VALIDADO', 'LEVANTAMENTO_HIDRAULICO_VALIDADO', 'LEVANTAMENTO_MATERIAIS_VALIDADO', 'MATERIAL_COMPLETO', 'PRODUCAO_INICIADA');

-- CreateEnum
CREATE TYPE "StatusPedidoCompra" AS ENUM ('AGUARDANDO_CONFIRMACAO', 'CONFIRMADO', 'EM_TRANSITO', 'ENTREGUE_PARCIAL', 'ENTREGUE_COMPLETO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusRemessa" AS ENUM ('RASCUNHO', 'AGUARDANDO_SEPARACAO', 'EM_SEPARACAO', 'AGUARDANDO_CONFERENCIA', 'EM_CONFERENCIA', 'LIBERADA_CARREGAMENTO', 'PARCIALMENTE_EXPEDIDA', 'TOTALMENTE_EXPEDIDA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusItemRemessa" AS ENUM ('PENDENTE', 'SEPARADO', 'CONFERIDO', 'CARREGADO', 'DIVERGENTE');

-- CreateEnum
CREATE TYPE "StatusVolume" AS ENUM ('ABERTO', 'CONFERIDO', 'ALOCADO', 'EMBARCADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoVolume" AS ENUM ('CAIXA', 'PALETE', 'FEIXE', 'AVULSO', 'KIT', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusCarregamento" AS ENUM ('RASCUNHO', 'EM_PREPARACAO', 'AGUARDANDO_CONFERENCIA', 'CONFERIDO', 'LIBERADO', 'CARREGADO', 'SAIDA_REGISTRADA', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoTransporte" AS ENUM ('PROPRIO', 'TERCEIRO');

-- CreateEnum
CREATE TYPE "TipoKitExpedicao" AS ENUM ('ELETRICO', 'HIDRAULICO', 'QDC');

-- CreateEnum
CREATE TYPE "TipoEventoExpedicao" AS ENUM ('REMESSA_CRIADA', 'REMESSA_CANCELADA', 'SEPARACAO_INICIADA', 'ITEM_SEPARADO', 'SEPARACAO_FINALIZADA', 'CONFERENCIA_INICIADA', 'ITEM_CONFERIDO', 'CONFERENCIA_FINALIZADA', 'VOLUME_CRIADO', 'VOLUME_CANCELADO', 'ITEM_VINCULADO_VOLUME', 'CARREGAMENTO_CRIADO', 'VOLUME_VINCULADO_CARREGAMENTO', 'VOLUME_DESVINCULADO_CARREGAMENTO', 'CARREGAMENTO_LIBERADO', 'CARREGAMENTO_MARCADO_CARREGADO', 'SAIDA_REGISTRADA', 'CARREGAMENTO_CANCELADO', 'ENTREGA_CONFIRMADA');

-- CreateEnum
CREATE TYPE "StatusIdempotencyKey" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

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
    "tier" INTEGER,
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
    "criterioPrecificacao" "CriterioPrecificacao",
    "construtora" TEXT NOT NULL,
    "incorporadora" TEXT,
    "tipo_estrutura" "TipoEstrutura",
    "metodo_construtivo" TEXT,
    "tipo_laje" TEXT,
    "tipo_vedacao" TEXT,
    "responsavel_comercial" TEXT NOT NULL,
    "status" "StatusEmpreendimento" NOT NULL DEFAULT 'PROSPECCAO',
    "tier" INTEGER,
    "data_prevista_inicio" TIMESTAMP(3),
    "data_prevista_entrega" TIMESTAMP(3),
    "valor_estimado" DECIMAL(14,2),
    "responsavel_comercial_user_id" TEXT,
    "responsavel_engenharia_user_id" TEXT,
    "responsavel_orcamentacao_user_id" TEXT,
    "comercial_concluido_em" TIMESTAMP(3),
    "engenharia_concluida_em" TIMESTAMP(3),
    "orcamentacao_concluida_em" TIMESTAMP(3),
    "observacoes" TEXT,
    "tem_hall" BOOLEAN NOT NULL DEFAULT false,
    "hall_tipo" TEXT,
    "hall_quantidade_especifica" INTEGER,
    "kit_eletrico" BOOLEAN NOT NULL DEFAULT false,
    "kit_hidraulico" BOOLEAN NOT NULL DEFAULT false,
    "kit_qdc" BOOLEAN NOT NULL DEFAULT false,
    "tipos_instalacao" TEXT NOT NULL DEFAULT '[]',
    "excluido_em" TIMESTAMP(3),
    "excluido_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empreendimentos_pkey" PRIMARY KEY ("id")
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
    "conteudo" BYTEA,
    "tamanho" INTEGER,
    "tipo" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_empreendimento_pkey" PRIMARY KEY ("id")
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
    "data_prevista_remessa" TIMESTAMP(3),
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
    "quantidade_unidades" INTEGER NOT NULL DEFAULT 1,
    "descricao" TEXT,
    "status_producao" "StatusProducaoTipologia" NOT NULL DEFAULT 'ATIVA',
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
    "precisa_trocar_senha" BOOLEAN NOT NULL DEFAULT false,
    "duplo_fator_ativo" BOOLEAN NOT NULL DEFAULT false,
    "duplo_fator_secreto" TEXT,
    "duplo_fator_obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "sessao_atual_token" TEXT,
    "token_reset_senha" TEXT,
    "token_reset_senha_expira" TIMESTAMP(3),
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

-- CreateTable
CREATE TABLE "tabela_preco_base" (
    "id" TEXT NOT NULL,
    "kit" TEXT NOT NULL,
    "criterio" "CriterioPrecificacao" NOT NULL DEFAULT 'AREA',
    "area_min" DOUBLE PRECISION NOT NULL,
    "area_max" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco_base" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabela_preco_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_sistema" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "criterioPrecificacao" "CriterioPrecificacao" NOT NULL DEFAULT 'AREA',
    "saldoCaixaAtual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "kitValorMinimo" DECIMAL(10,2) NOT NULL DEFAULT 550,
    "kitPontosInclusos" INTEGER NOT NULL DEFAULT 6,
    "kitValorPorPontoExtra" DECIMAL(10,2) NOT NULL DEFAULT 70,
    "metaProducaoDiariaUH" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "meta_dias_comercial" DECIMAL(6,1),
    "meta_dias_engenharia" DECIMAL(6,1),
    "meta_dias_orcamentacao" DECIMAL(6,1),
    "meta_dias_producao" DECIMAL(6,1),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_multiplicadores" (
    "id" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "multiplicador" DECIMAL(5,2) NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tier_multiplicadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "revisao" INTEGER NOT NULL DEFAULT 1,
    "status" "StatusOrcamento" NOT NULL DEFAULT 'EM_LEVANTAMENTO',
    "tier" INTEGER NOT NULL DEFAULT 2,
    "total_servicos_hgi" DECIMAL(12,2),
    "total_materiais" DECIMAL(12,2),
    "custo_direto" DECIMAL(12,2),
    "custo_indireto" DECIMAL(12,2),
    "margem_prevista" DECIMAL(12,2),
    "materiais_conferidos" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "responsavel_id" TEXT,
    "data_prazo" TIMESTAMP(3),
    "levantamento_eletrico_ids" TEXT,
    "levantamento_materiais_ids" TEXT,
    "status_aprovacao" TEXT NOT NULL DEFAULT 'NAO_ENVIADO',
    "aprovado_por_id" TEXT,
    "data_aprovacao" TIMESTAMP(3),
    "motivo_devolucao" TEXT,
    "proposta_gerada_em" TIMESTAMP(3),
    "proposta_gerada_por_id" TEXT,
    "proposta_documento_id" TEXT,
    "decisao_cliente" TEXT DEFAULT 'PENDENTE',
    "decisao_cliente_em" TIMESTAMP(3),
    "decisao_cliente_obs" TEXT,
    "criado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_servico_orcamento" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "tipologia_id" TEXT,
    "tipologia_nome" TEXT NOT NULL,
    "kit" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_base" DECIMAL(10,2) NOT NULL,
    "multiplicador" DECIMAL(5,2) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'NORMAL',
    "justificativa" TEXT,
    "tier_multiplicador_id" TEXT,
    "ajuste_manual" DECIMAL(12,2),
    "ajuste_motivo" TEXT,
    "memoria_calculo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_servico_orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_material_orcamento" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "material_eletrico_id" TEXT,
    "tipologia_nome" TEXT,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "unidade" TEXT NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL,
    "preco_unitario" DECIMAL(10,2),
    "total" DECIMAL(12,2),
    "situacao" TEXT NOT NULL DEFAULT 'PENDENTE_PRECIFICACAO',
    "justificativa" TEXT,
    "fornecedor_selecionado_id" TEXT,
    "cotacao_item_id" TEXT,
    "preco_base" DECIMAL(10,4),
    "frete" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "impostos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "perdas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "memoria_calculo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_material_orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais_pex" (
    "id" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL DEFAULT 'Barbi',
    "categoria" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "diametro" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "obs" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiais_pex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais_eletrico" (
    "id" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especificacao" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "preco_unitario" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "kit" TEXT NOT NULL DEFAULT 'ELETRICO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "obs" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiais_eletrico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levantamentos_materiais" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "validado_em" TIMESTAMP(3),
    "criado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levantamentos_materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_levantamento_material" (
    "id" TEXT NOT NULL,
    "levantamento_id" TEXT NOT NULL,
    "material_eletrico_id" TEXT,
    "fabricante" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "preco_unitario" DECIMAL(10,4) NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "distancia_por_unidade" DOUBLE PRECISION,
    "quantidade_apartamentos" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_levantamento_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprovacoes_proposta" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "aprovado_por_id" TEXT NOT NULL,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aprovacoes_proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levantamentos_hidraulicos" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "subtipo" "SubtipoHidraulico" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "validado_em" TIMESTAMP(3),
    "observacoes" TEXT,
    "criado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levantamentos_hidraulicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_levantamento_hidraulico" (
    "id" TEXT NOT NULL,
    "levantamento_id" TEXT NOT NULL,
    "material_pex_id" TEXT,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "diametro" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "quantidade" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_levantamento_hidraulico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuitos_catalogo" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "bitola" DOUBLE PRECISION NOT NULL,
    "tem_vermelho" BOOLEAN NOT NULL DEFAULT false,
    "tem_preto" BOOLEAN NOT NULL DEFAULT false,
    "tem_azul" BOOLEAN NOT NULL DEFAULT false,
    "tem_verde" BOOLEAN NOT NULL DEFAULT false,
    "tem_amarelo" BOOLEAN NOT NULL DEFAULT false,
    "tem_branco" BOOLEAN NOT NULL DEFAULT false,
    "tem_cinza" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circuitos_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levantamentos_eletricos" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "validado_em" TIMESTAMP(3),
    "revisao" INTEGER NOT NULL DEFAULT 1,
    "observacoes" TEXT,
    "pe_direito" DOUBLE PRECISION NOT NULL DEFAULT 2.8,
    "totais_importados_json" TEXT,
    "criado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levantamentos_eletricos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pecas_levantamento" (
    "id" TEXT NOT NULL,
    "levantamento_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "kit" "TipoEletroduto" NOT NULL DEFAULT 'LAJE',
    "local" TEXT,
    "trecho" TEXT NOT NULL,
    "obs" TEXT,
    "vertical_1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laje_1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horiz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laje_2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vertical_2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diametro" TEXT NOT NULL DEFAULT '3/4"',
    "sobra" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pecas_levantamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuitos_peca" (
    "id" TEXT NOT NULL,
    "peca_id" TEXT NOT NULL,
    "catalogo_id" TEXT,
    "bitola" DOUBLE PRECISION NOT NULL,
    "circuito" INTEGER,
    "tem_vermelho" BOOLEAN NOT NULL DEFAULT false,
    "tem_preto" BOOLEAN NOT NULL DEFAULT false,
    "tem_azul" BOOLEAN NOT NULL DEFAULT false,
    "tem_verde" BOOLEAN NOT NULL DEFAULT false,
    "tem_amarelo" BOOLEAN NOT NULL DEFAULT false,
    "tem_branco" BOOLEAN NOT NULL DEFAULT false,
    "tem_cinza" BOOLEAN NOT NULL DEFAULT false,
    "ident_retorno" TEXT,
    "eh_paralelo" BOOLEAN NOT NULL DEFAULT false,
    "eh_retorno" BOOLEAN NOT NULL DEFAULT false,
    "sobra_override" DOUBLE PRECISION,
    "horiz_override" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circuitos_peca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "logradouro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tipos" "TipoFornecedor"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedor_contatos" (
    "id" TEXT NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedor_contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos_fornecedor" (
    "id" TEXT NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "material_eletrico_id" TEXT NOT NULL,
    "codigo_fornecedor" TEXT,
    "preco_unitario" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "status" "StatusCotacao" NOT NULL DEFAULT 'RASCUNHO',
    "observacoes" TEXT,
    "validade_ate" TIMESTAMP(3),
    "total_eletrica" DECIMAL(12,2),
    "total_qdc" DECIMAL(12,2),
    "total_geral" DECIMAL(12,2),
    "itens_nao_cotaveis" TEXT,
    "responsavel_id" TEXT,
    "data_prazo" TIMESTAMP(3),
    "frete" DECIMAL(10,2),
    "condicao_pagamento" TEXT,
    "disponibilidade" TEXT,
    "selecionada_em" TIMESTAMP(3),
    "selecionada_por_id" TEXT,
    "motivo_selecao" TEXT,
    "historico_precos" TEXT,
    "criada_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao_itens" (
    "id" TEXT NOT NULL,
    "cotacao_id" TEXT NOT NULL,
    "material_eletrico_id" TEXT,
    "descricao" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "kit" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "precoUnitario" DECIMAL(10,4) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotacao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas_grupo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_despesa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "comportamento" "ComportamentoCusto",
    "natureza" "NaturezaGasto",
    "apropriacao" "ApropriacaoGasto",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_fixas_modelo" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "diaUtilVencimento" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_fixas_modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "conta_fixa_modelo_id" TEXT,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoContaPagar" NOT NULL DEFAULT 'AVULSA',
    "valor" DECIMAL(12,2) NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "parcela_atual" INTEGER,
    "parcela_total" INTEGER,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pago_em" TIMESTAMP(3),
    "observacoes" TEXT,
    "criado_por_id" TEXT,
    "pago_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "orcamento_id" TEXT,
    "tipo" "TipoContaReceber" NOT NULL DEFAULT 'ENTRADA',
    "pavimento_id" TEXT,
    "empresa_id" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "data_envio" TIMESTAMP(3),
    "data_prevista" TIMESTAMP(3),
    "recebido" BOOLEAN NOT NULL DEFAULT false,
    "recebido_em" TIMESTAMP(3),
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_seguranca" (
    "id" TEXT NOT NULL,
    "tipo" "TipoLogSeguranca" NOT NULL,
    "email" TEXT NOT NULL,
    "usuario_id" TEXT,
    "detalhes" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_seguranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bancadas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "unidade_medida" "UnidadeMedidaBancada" NOT NULL,
    "tipo_calculo" "TipoCalculoBancada" NOT NULL DEFAULT 'CONTAGEM',
    "uh_referencia" DECIMAL(10,4) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bancadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operadores_producao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operadores_producao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_producao" (
    "id" TEXT NOT NULL,
    "bancada_id" TEXT NOT NULL,
    "operador_id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "peca_id" TEXT NOT NULL,
    "unidades_concluidas" INTEGER NOT NULL,
    "turno" "TurnoProducao" NOT NULL DEFAULT 'MANHA',
    "quantidade" DECIMAL(10,2) NOT NULL,
    "registrado_por_user_id" TEXT NOT NULL,
    "valor_original" DECIMAL(10,2),
    "corrigido_por_user_id" TEXT,
    "corrigido_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_producao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_empreendimento_material" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "material_eletrico_id" TEXT NOT NULL,
    "saldo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_empreendimento_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "material_eletrico_id" TEXT NOT NULL,
    "tipo" "TipoMovimentacaoEstoque" NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipologia_id" TEXT,
    "observacao" TEXT,
    "registrado_por_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcos_operacionais" (
    "id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipologia_id" TEXT,
    "etapa" "EtapaOperacional" NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marcos_operacionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_compra" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cotacao_id" TEXT NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "status" "StatusPedidoCompra" NOT NULL DEFAULT 'AGUARDANDO_CONFIRMACAO',
    "data_pedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_prevista_entrega" TIMESTAMP(3),
    "data_confirmado_em" TIMESTAMP(3),
    "criado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido_compra" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "material_eletrico_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade_pedida" DECIMAL(12,3) NOT NULL,
    "quantidade_recebida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_pedido_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento_jornada" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NAO_INICIADA',
    "responsavel_id" TEXT,
    "data_inicio" TIMESTAMP(3),
    "data_prevista" TIMESTAMP(3),
    "data_conclusao" TIMESTAMP(3),
    "motivo_bloqueio" TEXT,
    "pendencias" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamento_jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento_historico" (
    "id" TEXT NOT NULL,
    "orcamento_id" TEXT NOT NULL,
    "tipoAlteracao" TEXT NOT NULL,
    "recursoTipo" TEXT,
    "recurso_id" TEXT,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "justificativa" TEXT,
    "registrado_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcamento_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento_negociacoes" (
    "id" TEXT NOT NULL,
    "cotacao_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_resposta" TIMESTAMP(3),
    "registrado_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcamento_negociacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transportadoras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transportadoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "cnh" TEXT,
    "telefone" TEXT,
    "empresa_id" TEXT NOT NULL,
    "transportadora_id" TEXT,
    "tipo" "TipoTransporte" NOT NULL DEFAULT 'TERCEIRO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT,
    "capacidade_kg" DECIMAL(10,2),
    "empresa_id" TEXT NOT NULL,
    "transportadora_id" TEXT,
    "tipo" "TipoTransporte" NOT NULL DEFAULT 'TERCEIRO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remessa_contadores" (
    "empresa_id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "remessa_contadores_pkey" PRIMARY KEY ("empresa_id","ano")
);

-- CreateTable
CREATE TABLE "remessas" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "sequencial" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "origem" TEXT,
    "torre_id" TEXT,
    "pavimento_id" TEXT,
    "etapa" TEXT,
    "endereco_entrega" TEXT NOT NULL,
    "status" "StatusRemessa" NOT NULL DEFAULT 'RASCUNHO',
    "proximo_numero_carregamento" INTEGER NOT NULL DEFAULT 1,
    "data_saida_prevista" TIMESTAMP(3),
    "data_entrega_prevista" TIMESTAMP(3),
    "observacoes" TEXT,
    "criado_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "remessas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_remessa" (
    "id" TEXT NOT NULL,
    "remessa_id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "tipo_kit" "TipoKitExpedicao" NOT NULL,
    "tipologia_nome" TEXT NOT NULL,
    "codigo" TEXT,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'kit',
    "torre" TEXT,
    "pavimento" TEXT,
    "etapa" TEXT,
    "apartamento" TEXT,
    "quantidade_prevista" INTEGER NOT NULL,
    "quantidade_separada" INTEGER NOT NULL DEFAULT 0,
    "quantidade_conferida" INTEGER NOT NULL DEFAULT 0,
    "quantidade_alocada" INTEGER NOT NULL DEFAULT 0,
    "quantidade_carregada" INTEGER NOT NULL DEFAULT 0,
    "quantidade_expedida" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusItemRemessa" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_remessa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volumes" (
    "id" TEXT NOT NULL,
    "remessa_id" TEXT NOT NULL,
    "numero_volume" INTEGER NOT NULL,
    "tipo" "TipoVolume" NOT NULL DEFAULT 'CAIXA',
    "codigo_qr" TEXT,
    "descricao" TEXT,
    "peso" DECIMAL(10,3),
    "lacre" TEXT,
    "status" "StatusVolume" NOT NULL DEFAULT 'ABERTO',
    "observacao" TEXT,
    "conferido_por_id" TEXT,
    "conferido_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_volume" (
    "id" TEXT NOT NULL,
    "volume_id" TEXT NOT NULL,
    "item_remessa_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_volume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carregamentos" (
    "id" TEXT NOT NULL,
    "remessa_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "StatusCarregamento" NOT NULL DEFAULT 'RASCUNHO',
    "transportadora_id" TEXT,
    "motorista_id" TEXT,
    "veiculo_id" TEXT,
    "placa" TEXT,
    "data_carregamento" TIMESTAMP(3),
    "data_saida" TIMESTAMP(3),
    "observacao" TEXT,
    "criado_por_id" TEXT NOT NULL,
    "liberado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carregamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_carregamento" (
    "id" TEXT NOT NULL,
    "carregamento_id" TEXT NOT NULL,
    "item_remessa_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_carregamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volumes_carregamento" (
    "id" TEXT NOT NULL,
    "carregamento_id" TEXT NOT NULL,
    "volume_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volumes_carregamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedicao_historico" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "remessa_id" TEXT NOT NULL,
    "carregamento_id" TEXT,
    "tipo_evento" "TipoEventoExpedicao" NOT NULL,
    "status_anterior" TEXT,
    "status_novo" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expedicao_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "operacao" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" "StatusIdempotencyKey" NOT NULL DEFAULT 'PROCESSING',
    "resultado_id" TEXT,
    "resposta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "eventos_empreendimento_empreendimento_id_idx" ON "eventos_empreendimento"("empreendimento_id");

-- CreateIndex
CREATE INDEX "eventos_empreendimento_created_at_idx" ON "eventos_empreendimento"("created_at");

-- CreateIndex
CREATE INDEX "documentos_empreendimento_empreendimento_id_idx" ON "documentos_empreendimento"("empreendimento_id");

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

-- CreateIndex
CREATE INDEX "tabela_preco_base_kit_idx" ON "tabela_preco_base"("kit");

-- CreateIndex
CREATE INDEX "tabela_preco_base_criterio_idx" ON "tabela_preco_base"("criterio");

-- CreateIndex
CREATE UNIQUE INDEX "tier_multiplicadores_tier_key" ON "tier_multiplicadores"("tier");

-- CreateIndex
CREATE INDEX "orcamentos_empreendimento_id_idx" ON "orcamentos"("empreendimento_id");

-- CreateIndex
CREATE INDEX "orcamentos_responsavel_id_idx" ON "orcamentos"("responsavel_id");

-- CreateIndex
CREATE INDEX "orcamentos_status_aprovacao_idx" ON "orcamentos"("status_aprovacao");

-- CreateIndex
CREATE INDEX "itens_servico_orcamento_orcamento_id_idx" ON "itens_servico_orcamento"("orcamento_id");

-- CreateIndex
CREATE INDEX "itens_material_orcamento_orcamento_id_idx" ON "itens_material_orcamento"("orcamento_id");

-- CreateIndex
CREATE INDEX "itens_material_orcamento_fornecedor_selecionado_id_idx" ON "itens_material_orcamento"("fornecedor_selecionado_id");

-- CreateIndex
CREATE INDEX "materiais_pex_fabricante_categoria_idx" ON "materiais_pex"("fabricante", "categoria");

-- CreateIndex
CREATE INDEX "materiais_pex_nome_idx" ON "materiais_pex"("nome");

-- CreateIndex
CREATE INDEX "materiais_eletrico_fabricante_categoria_idx" ON "materiais_eletrico"("fabricante", "categoria");

-- CreateIndex
CREATE INDEX "materiais_eletrico_nome_idx" ON "materiais_eletrico"("nome");

-- CreateIndex
CREATE INDEX "levantamentos_materiais_empreendimento_id_idx" ON "levantamentos_materiais"("empreendimento_id");

-- CreateIndex
CREATE INDEX "levantamentos_materiais_tipologia_id_idx" ON "levantamentos_materiais"("tipologia_id");

-- CreateIndex
CREATE UNIQUE INDEX "levantamentos_materiais_empreendimento_id_tipologia_id_key" ON "levantamentos_materiais"("empreendimento_id", "tipologia_id");

-- CreateIndex
CREATE INDEX "itens_levantamento_material_levantamento_id_idx" ON "itens_levantamento_material"("levantamento_id");

-- CreateIndex
CREATE INDEX "aprovacoes_proposta_empreendimento_id_tipologia_id_idx" ON "aprovacoes_proposta"("empreendimento_id", "tipologia_id");

-- CreateIndex
CREATE INDEX "levantamentos_hidraulicos_empreendimento_id_idx" ON "levantamentos_hidraulicos"("empreendimento_id");

-- CreateIndex
CREATE INDEX "levantamentos_hidraulicos_tipologia_id_idx" ON "levantamentos_hidraulicos"("tipologia_id");

-- CreateIndex
CREATE UNIQUE INDEX "levantamentos_hidraulicos_empreendimento_id_tipologia_id_su_key" ON "levantamentos_hidraulicos"("empreendimento_id", "tipologia_id", "subtipo");

-- CreateIndex
CREATE INDEX "itens_levantamento_hidraulico_levantamento_id_idx" ON "itens_levantamento_hidraulico"("levantamento_id");

-- CreateIndex
CREATE INDEX "circuitos_catalogo_empreendimento_id_idx" ON "circuitos_catalogo"("empreendimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "circuitos_catalogo_empreendimento_id_numero_key" ON "circuitos_catalogo"("empreendimento_id", "numero");

-- CreateIndex
CREATE INDEX "levantamentos_eletricos_empreendimento_id_idx" ON "levantamentos_eletricos"("empreendimento_id");

-- CreateIndex
CREATE INDEX "levantamentos_eletricos_tipologia_id_idx" ON "levantamentos_eletricos"("tipologia_id");

-- CreateIndex
CREATE UNIQUE INDEX "levantamentos_eletricos_empreendimento_id_tipologia_id_key" ON "levantamentos_eletricos"("empreendimento_id", "tipologia_id");

-- CreateIndex
CREATE INDEX "pecas_levantamento_levantamento_id_idx" ON "pecas_levantamento"("levantamento_id");

-- CreateIndex
CREATE INDEX "circuitos_peca_peca_id_idx" ON "circuitos_peca"("peca_id");

-- CreateIndex
CREATE INDEX "circuitos_peca_catalogo_id_idx" ON "circuitos_peca"("catalogo_id");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_codigo_key" ON "fornecedores"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_cnpj_key" ON "fornecedores"("cnpj");

-- CreateIndex
CREATE INDEX "fornecedores_ativo_idx" ON "fornecedores"("ativo");

-- CreateIndex
CREATE INDEX "fornecedores_cnpj_idx" ON "fornecedores"("cnpj");

-- CreateIndex
CREATE INDEX "fornecedor_contatos_fornecedor_id_idx" ON "fornecedor_contatos"("fornecedor_id");

-- CreateIndex
CREATE INDEX "produtos_fornecedor_fornecedor_id_idx" ON "produtos_fornecedor"("fornecedor_id");

-- CreateIndex
CREATE INDEX "produtos_fornecedor_material_eletrico_id_idx" ON "produtos_fornecedor"("material_eletrico_id");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_fornecedor_fornecedor_id_material_eletrico_id_key" ON "produtos_fornecedor"("fornecedor_id", "material_eletrico_id");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_fornecedor_fornecedor_id_codigo_fornecedor_key" ON "produtos_fornecedor"("fornecedor_id", "codigo_fornecedor");

-- CreateIndex
CREATE UNIQUE INDEX "cotacoes_numero_key" ON "cotacoes"("numero");

-- CreateIndex
CREATE INDEX "cotacoes_orcamento_id_idx" ON "cotacoes"("orcamento_id");

-- CreateIndex
CREATE INDEX "cotacoes_fornecedor_id_idx" ON "cotacoes"("fornecedor_id");

-- CreateIndex
CREATE INDEX "cotacoes_status_idx" ON "cotacoes"("status");

-- CreateIndex
CREATE INDEX "cotacao_itens_cotacao_id_idx" ON "cotacao_itens"("cotacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_grupo_nome_key" ON "empresas_grupo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_despesa_nome_key" ON "categorias_despesa"("nome");

-- CreateIndex
CREATE INDEX "contas_fixas_modelo_empresa_id_idx" ON "contas_fixas_modelo"("empresa_id");

-- CreateIndex
CREATE INDEX "contas_pagar_empresa_id_idx" ON "contas_pagar"("empresa_id");

-- CreateIndex
CREATE INDEX "contas_pagar_categoria_id_idx" ON "contas_pagar"("categoria_id");

-- CreateIndex
CREATE INDEX "contas_pagar_pago_data_vencimento_idx" ON "contas_pagar"("pago", "data_vencimento");

-- CreateIndex
CREATE INDEX "contas_receber_empresa_id_idx" ON "contas_receber"("empresa_id");

-- CreateIndex
CREATE INDEX "contas_receber_empreendimento_id_idx" ON "contas_receber"("empreendimento_id");

-- CreateIndex
CREATE INDEX "contas_receber_recebido_data_prevista_idx" ON "contas_receber"("recebido", "data_prevista");

-- CreateIndex
CREATE INDEX "logs_seguranca_email_created_at_idx" ON "logs_seguranca"("email", "created_at");

-- CreateIndex
CREATE INDEX "logs_seguranca_tipo_created_at_idx" ON "logs_seguranca"("tipo", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bancadas_nome_key" ON "bancadas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "bancadas_ordem_key" ON "bancadas"("ordem");

-- CreateIndex
CREATE INDEX "registros_producao_bancada_id_created_at_idx" ON "registros_producao"("bancada_id", "created_at");

-- CreateIndex
CREATE INDEX "registros_producao_empreendimento_id_idx" ON "registros_producao"("empreendimento_id");

-- CreateIndex
CREATE INDEX "registros_producao_operador_id_created_at_idx" ON "registros_producao"("operador_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_empreendimento_material_empreendimento_id_material__key" ON "estoque_empreendimento_material"("empreendimento_id", "material_eletrico_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_material_eletrico_id_created_at_idx" ON "movimentacoes_estoque"("material_eletrico_id", "created_at");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_empreendimento_id_tipologia_id_idx" ON "movimentacoes_estoque"("empreendimento_id", "tipologia_id");

-- CreateIndex
CREATE INDEX "marcos_operacionais_empreendimento_id_tipologia_id_etapa_idx" ON "marcos_operacionais"("empreendimento_id", "tipologia_id", "etapa");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_compra_numero_key" ON "pedidos_compra"("numero");

-- CreateIndex
CREATE INDEX "pedidos_compra_empreendimento_id_status_idx" ON "pedidos_compra"("empreendimento_id", "status");

-- CreateIndex
CREATE INDEX "pedidos_compra_fornecedor_id_idx" ON "pedidos_compra"("fornecedor_id");

-- CreateIndex
CREATE INDEX "itens_pedido_compra_pedido_id_idx" ON "itens_pedido_compra"("pedido_id");

-- CreateIndex
CREATE INDEX "orcamento_jornada_orcamento_id_status_idx" ON "orcamento_jornada"("orcamento_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "orcamento_jornada_orcamento_id_etapa_key" ON "orcamento_jornada"("orcamento_id", "etapa");

-- CreateIndex
CREATE INDEX "orcamento_historico_orcamento_id_created_at_idx" ON "orcamento_historico"("orcamento_id", "created_at");

-- CreateIndex
CREATE INDEX "orcamento_historico_tipoAlteracao_idx" ON "orcamento_historico"("tipoAlteracao");

-- CreateIndex
CREATE INDEX "orcamento_negociacoes_cotacao_id_created_at_idx" ON "orcamento_negociacoes"("cotacao_id", "created_at");

-- CreateIndex
CREATE INDEX "motoristas_transportadora_id_idx" ON "motoristas"("transportadora_id");

-- CreateIndex
CREATE INDEX "motoristas_empresa_id_idx" ON "motoristas"("empresa_id");

-- CreateIndex
CREATE INDEX "veiculos_transportadora_id_idx" ON "veiculos"("transportadora_id");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_empresa_id_placa_key" ON "veiculos"("empresa_id", "placa");

-- CreateIndex
CREATE INDEX "remessas_empreendimento_id_status_idx" ON "remessas"("empreendimento_id", "status");

-- CreateIndex
CREATE INDEX "remessas_cliente_id_idx" ON "remessas"("cliente_id");

-- CreateIndex
CREATE INDEX "remessas_status_idx" ON "remessas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "remessas_empresa_id_ano_sequencial_key" ON "remessas"("empresa_id", "ano", "sequencial");

-- CreateIndex
CREATE UNIQUE INDEX "remessas_empresa_id_numero_key" ON "remessas"("empresa_id", "numero");

-- CreateIndex
CREATE INDEX "itens_remessa_remessa_id_idx" ON "itens_remessa"("remessa_id");

-- CreateIndex
CREATE INDEX "itens_remessa_tipologia_id_idx" ON "itens_remessa"("tipologia_id");

-- CreateIndex
CREATE INDEX "volumes_remessa_id_idx" ON "volumes"("remessa_id");

-- CreateIndex
CREATE INDEX "volumes_status_idx" ON "volumes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "volumes_remessa_id_numero_volume_key" ON "volumes"("remessa_id", "numero_volume");

-- CreateIndex
CREATE INDEX "itens_volume_volume_id_idx" ON "itens_volume"("volume_id");

-- CreateIndex
CREATE INDEX "itens_volume_item_remessa_id_idx" ON "itens_volume"("item_remessa_id");

-- CreateIndex
CREATE INDEX "carregamentos_remessa_id_idx" ON "carregamentos"("remessa_id");

-- CreateIndex
CREATE INDEX "carregamentos_status_idx" ON "carregamentos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "carregamentos_remessa_id_numero_key" ON "carregamentos"("remessa_id", "numero");

-- CreateIndex
CREATE INDEX "itens_carregamento_carregamento_id_idx" ON "itens_carregamento"("carregamento_id");

-- CreateIndex
CREATE INDEX "itens_carregamento_item_remessa_id_idx" ON "itens_carregamento"("item_remessa_id");

-- CreateIndex
CREATE UNIQUE INDEX "itens_carregamento_carregamento_id_item_remessa_id_key" ON "itens_carregamento"("carregamento_id", "item_remessa_id");

-- CreateIndex
CREATE INDEX "volumes_carregamento_carregamento_id_idx" ON "volumes_carregamento"("carregamento_id");

-- CreateIndex
CREATE INDEX "volumes_carregamento_volume_id_idx" ON "volumes_carregamento"("volume_id");

-- CreateIndex
CREATE UNIQUE INDEX "volumes_carregamento_carregamento_id_volume_id_key" ON "volumes_carregamento"("carregamento_id", "volume_id");

-- CreateIndex
CREATE INDEX "expedicao_historico_remessa_id_created_at_idx" ON "expedicao_historico"("remessa_id", "created_at");

-- CreateIndex
CREATE INDEX "expedicao_historico_carregamento_id_created_at_idx" ON "expedicao_historico"("carregamento_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_empresa_id_operacao_chave_key" ON "idempotency_keys"("empresa_id", "operacao", "chave");

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
ALTER TABLE "eventos_empreendimento" ADD CONSTRAINT "eventos_empreendimento_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_empreendimento" ADD CONSTRAINT "eventos_empreendimento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_empreendimento" ADD CONSTRAINT "documentos_empreendimento_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_empreendimento" ADD CONSTRAINT "documentos_empreendimento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_proposta_gerada_por_id_fkey" FOREIGN KEY ("proposta_gerada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_servico_orcamento" ADD CONSTRAINT "itens_servico_orcamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_servico_orcamento" ADD CONSTRAINT "itens_servico_orcamento_tier_multiplicador_id_fkey" FOREIGN KEY ("tier_multiplicador_id") REFERENCES "tier_multiplicadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_material_orcamento" ADD CONSTRAINT "itens_material_orcamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_material_orcamento" ADD CONSTRAINT "itens_material_orcamento_material_eletrico_id_fkey" FOREIGN KEY ("material_eletrico_id") REFERENCES "materiais_eletrico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_material_orcamento" ADD CONSTRAINT "itens_material_orcamento_fornecedor_selecionado_id_fkey" FOREIGN KEY ("fornecedor_selecionado_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_material_orcamento" ADD CONSTRAINT "itens_material_orcamento_cotacao_item_id_fkey" FOREIGN KEY ("cotacao_item_id") REFERENCES "cotacao_itens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_materiais" ADD CONSTRAINT "levantamentos_materiais_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_materiais" ADD CONSTRAINT "levantamentos_materiais_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_materiais" ADD CONSTRAINT "levantamentos_materiais_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_levantamento_material" ADD CONSTRAINT "itens_levantamento_material_levantamento_id_fkey" FOREIGN KEY ("levantamento_id") REFERENCES "levantamentos_materiais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_levantamento_material" ADD CONSTRAINT "itens_levantamento_material_material_eletrico_id_fkey" FOREIGN KEY ("material_eletrico_id") REFERENCES "materiais_eletrico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes_proposta" ADD CONSTRAINT "aprovacoes_proposta_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes_proposta" ADD CONSTRAINT "aprovacoes_proposta_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes_proposta" ADD CONSTRAINT "aprovacoes_proposta_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_hidraulicos" ADD CONSTRAINT "levantamentos_hidraulicos_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_hidraulicos" ADD CONSTRAINT "levantamentos_hidraulicos_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_hidraulicos" ADD CONSTRAINT "levantamentos_hidraulicos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_levantamento_hidraulico" ADD CONSTRAINT "itens_levantamento_hidraulico_levantamento_id_fkey" FOREIGN KEY ("levantamento_id") REFERENCES "levantamentos_hidraulicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_levantamento_hidraulico" ADD CONSTRAINT "itens_levantamento_hidraulico_material_pex_id_fkey" FOREIGN KEY ("material_pex_id") REFERENCES "materiais_pex"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circuitos_catalogo" ADD CONSTRAINT "circuitos_catalogo_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_eletricos" ADD CONSTRAINT "levantamentos_eletricos_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_eletricos" ADD CONSTRAINT "levantamentos_eletricos_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levantamentos_eletricos" ADD CONSTRAINT "levantamentos_eletricos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas_levantamento" ADD CONSTRAINT "pecas_levantamento_levantamento_id_fkey" FOREIGN KEY ("levantamento_id") REFERENCES "levantamentos_eletricos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circuitos_peca" ADD CONSTRAINT "circuitos_peca_peca_id_fkey" FOREIGN KEY ("peca_id") REFERENCES "pecas_levantamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circuitos_peca" ADD CONSTRAINT "circuitos_peca_catalogo_id_fkey" FOREIGN KEY ("catalogo_id") REFERENCES "circuitos_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedor_contatos" ADD CONSTRAINT "fornecedor_contatos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos_fornecedor" ADD CONSTRAINT "produtos_fornecedor_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos_fornecedor" ADD CONSTRAINT "produtos_fornecedor_material_eletrico_id_fkey" FOREIGN KEY ("material_eletrico_id") REFERENCES "materiais_eletrico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_selecionada_por_id_fkey" FOREIGN KEY ("selecionada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_criada_por_id_fkey" FOREIGN KEY ("criada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao_itens" ADD CONSTRAINT "cotacao_itens_cotacao_id_fkey" FOREIGN KEY ("cotacao_id") REFERENCES "cotacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao_itens" ADD CONSTRAINT "cotacao_itens_material_eletrico_id_fkey" FOREIGN KEY ("material_eletrico_id") REFERENCES "materiais_eletrico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_fixas_modelo" ADD CONSTRAINT "contas_fixas_modelo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_fixas_modelo" ADD CONSTRAINT "contas_fixas_modelo_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_conta_fixa_modelo_id_fkey" FOREIGN KEY ("conta_fixa_modelo_id") REFERENCES "contas_fixas_modelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_pago_por_id_fkey" FOREIGN KEY ("pago_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_pavimento_id_fkey" FOREIGN KEY ("pavimento_id") REFERENCES "pavimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_seguranca" ADD CONSTRAINT "logs_seguranca_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_producao" ADD CONSTRAINT "registros_producao_bancada_id_fkey" FOREIGN KEY ("bancada_id") REFERENCES "bancadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_producao" ADD CONSTRAINT "registros_producao_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "operadores_producao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_producao" ADD CONSTRAINT "registros_producao_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_producao" ADD CONSTRAINT "registros_producao_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_producao" ADD CONSTRAINT "registros_producao_peca_id_fkey" FOREIGN KEY ("peca_id") REFERENCES "pecas_levantamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_producao" ADD CONSTRAINT "registros_producao_registrado_por_user_id_fkey" FOREIGN KEY ("registrado_por_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_producao" ADD CONSTRAINT "registros_producao_corrigido_por_user_id_fkey" FOREIGN KEY ("corrigido_por_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_empreendimento_material" ADD CONSTRAINT "estoque_empreendimento_material_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_empreendimento_material" ADD CONSTRAINT "estoque_empreendimento_material_material_eletrico_id_fkey" FOREIGN KEY ("material_eletrico_id") REFERENCES "materiais_eletrico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_material_eletrico_id_fkey" FOREIGN KEY ("material_eletrico_id") REFERENCES "materiais_eletrico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_registrado_por_user_id_fkey" FOREIGN KEY ("registrado_por_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcos_operacionais" ADD CONSTRAINT "marcos_operacionais_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcos_operacionais" ADD CONSTRAINT "marcos_operacionais_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_cotacao_id_fkey" FOREIGN KEY ("cotacao_id") REFERENCES "cotacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido_compra" ADD CONSTRAINT "itens_pedido_compra_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido_compra" ADD CONSTRAINT "itens_pedido_compra_material_eletrico_id_fkey" FOREIGN KEY ("material_eletrico_id") REFERENCES "materiais_eletrico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_jornada" ADD CONSTRAINT "orcamento_jornada_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_jornada" ADD CONSTRAINT "orcamento_jornada_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_historico" ADD CONSTRAINT "orcamento_historico_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_historico" ADD CONSTRAINT "orcamento_historico_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_negociacoes" ADD CONSTRAINT "orcamento_negociacoes_cotacao_id_fkey" FOREIGN KEY ("cotacao_id") REFERENCES "cotacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_negociacoes" ADD CONSTRAINT "orcamento_negociacoes_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_transportadora_id_fkey" FOREIGN KEY ("transportadora_id") REFERENCES "transportadoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_transportadora_id_fkey" FOREIGN KEY ("transportadora_id") REFERENCES "transportadoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remessas" ADD CONSTRAINT "remessas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remessas" ADD CONSTRAINT "remessas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remessas" ADD CONSTRAINT "remessas_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remessas" ADD CONSTRAINT "remessas_torre_id_fkey" FOREIGN KEY ("torre_id") REFERENCES "torres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remessas" ADD CONSTRAINT "remessas_pavimento_id_fkey" FOREIGN KEY ("pavimento_id") REFERENCES "pavimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remessas" ADD CONSTRAINT "remessas_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_remessa" ADD CONSTRAINT "itens_remessa_remessa_id_fkey" FOREIGN KEY ("remessa_id") REFERENCES "remessas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_remessa" ADD CONSTRAINT "itens_remessa_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volumes" ADD CONSTRAINT "volumes_remessa_id_fkey" FOREIGN KEY ("remessa_id") REFERENCES "remessas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volumes" ADD CONSTRAINT "volumes_conferido_por_id_fkey" FOREIGN KEY ("conferido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_volume" ADD CONSTRAINT "itens_volume_volume_id_fkey" FOREIGN KEY ("volume_id") REFERENCES "volumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_volume" ADD CONSTRAINT "itens_volume_item_remessa_id_fkey" FOREIGN KEY ("item_remessa_id") REFERENCES "itens_remessa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carregamentos" ADD CONSTRAINT "carregamentos_remessa_id_fkey" FOREIGN KEY ("remessa_id") REFERENCES "remessas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carregamentos" ADD CONSTRAINT "carregamentos_transportadora_id_fkey" FOREIGN KEY ("transportadora_id") REFERENCES "transportadoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carregamentos" ADD CONSTRAINT "carregamentos_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carregamentos" ADD CONSTRAINT "carregamentos_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carregamentos" ADD CONSTRAINT "carregamentos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carregamentos" ADD CONSTRAINT "carregamentos_liberado_por_id_fkey" FOREIGN KEY ("liberado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_carregamento" ADD CONSTRAINT "itens_carregamento_carregamento_id_fkey" FOREIGN KEY ("carregamento_id") REFERENCES "carregamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_carregamento" ADD CONSTRAINT "itens_carregamento_item_remessa_id_fkey" FOREIGN KEY ("item_remessa_id") REFERENCES "itens_remessa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volumes_carregamento" ADD CONSTRAINT "volumes_carregamento_carregamento_id_fkey" FOREIGN KEY ("carregamento_id") REFERENCES "carregamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volumes_carregamento" ADD CONSTRAINT "volumes_carregamento_volume_id_fkey" FOREIGN KEY ("volume_id") REFERENCES "volumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedicao_historico" ADD CONSTRAINT "expedicao_historico_remessa_id_fkey" FOREIGN KEY ("remessa_id") REFERENCES "remessas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedicao_historico" ADD CONSTRAINT "expedicao_historico_carregamento_id_fkey" FOREIGN KEY ("carregamento_id") REFERENCES "carregamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedicao_historico" ADD CONSTRAINT "expedicao_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

heitor_gouveia@construapp-producao:~/erp-engenharia$ 