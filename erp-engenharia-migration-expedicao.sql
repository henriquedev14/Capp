-- Migration: Módulo de Expedição (núcleo operacional)
-- Puramente aditiva — nenhum ALTER/DROP em coluna existente.
-- 13 tabelas novas + relações reversas (sem impacto de coluna nas tabelas atuais).

-- ============================================================================
-- Enums (Postgres CREATE TYPE)
-- ============================================================================

CREATE TYPE "StatusRemessa" AS ENUM (
  'RASCUNHO', 'AGUARDANDO_SEPARACAO', 'EM_SEPARACAO', 'AGUARDANDO_CONFERENCIA',
  'EM_CONFERENCIA', 'LIBERADA_CARREGAMENTO', 'PARCIALMENTE_EXPEDIDA',
  'TOTALMENTE_EXPEDIDA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA'
);

CREATE TYPE "StatusItemRemessa" AS ENUM ('PENDENTE', 'SEPARADO', 'CONFERIDO', 'CARREGADO', 'DIVERGENTE');

CREATE TYPE "StatusVolume" AS ENUM ('ABERTO', 'CONFERIDO', 'ALOCADO', 'EMBARCADO', 'CANCELADO');

CREATE TYPE "TipoVolume" AS ENUM ('CAIXA', 'PALETE', 'FEIXE', 'AVULSO', 'KIT', 'OUTRO');

CREATE TYPE "StatusCarregamento" AS ENUM (
  'RASCUNHO', 'EM_PREPARACAO', 'AGUARDANDO_CONFERENCIA', 'CONFERIDO',
  'LIBERADO', 'CARREGADO', 'SAIDA_REGISTRADA', 'ENTREGUE', 'CANCELADO'
);

CREATE TYPE "TipoTransporte" AS ENUM ('PROPRIO', 'TERCEIRO');

CREATE TYPE "TipoKitExpedicao" AS ENUM ('ELETRICO', 'HIDRAULICO', 'QDC');

CREATE TYPE "TipoEventoExpedicao" AS ENUM (
  'REMESSA_CRIADA', 'REMESSA_CANCELADA', 'SEPARACAO_INICIADA', 'ITEM_SEPARADO',
  'SEPARACAO_FINALIZADA', 'CONFERENCIA_INICIADA', 'ITEM_CONFERIDO',
  'CONFERENCIA_FINALIZADA', 'VOLUME_CRIADO', 'VOLUME_CANCELADO',
  'ITEM_VINCULADO_VOLUME', 'CARREGAMENTO_CRIADO', 'VOLUME_VINCULADO_CARREGAMENTO',
  'VOLUME_DESVINCULADO_CARREGAMENTO', 'CARREGAMENTO_LIBERADO',
  'CARREGAMENTO_MARCADO_CARREGADO', 'SAIDA_REGISTRADA', 'CARREGAMENTO_CANCELADO',
  'ENTREGA_CONFIRMADA'
);

CREATE TYPE "StatusIdempotencyKey" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- ============================================================================
-- Tabelas
-- ============================================================================

CREATE TABLE transportadoras (
  id VARCHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  telefone VARCHAR(30),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE motoristas (
  id VARCHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(20),
  cnh VARCHAR(30),
  telefone VARCHAR(30),
  empresa_id VARCHAR(36) NOT NULL REFERENCES empresas_grupo(id) ON DELETE RESTRICT,
  transportadora_id VARCHAR(36) REFERENCES transportadoras(id) ON DELETE SET NULL,
  tipo "TipoTransporte" NOT NULL DEFAULT 'TERCEIRO',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_motoristas_transportadora ON motoristas(transportadora_id);
CREATE INDEX idx_motoristas_empresa ON motoristas(empresa_id);

CREATE TABLE veiculos (
  id VARCHAR(36) PRIMARY KEY,
  placa VARCHAR(10) NOT NULL,
  modelo VARCHAR(100),
  capacidade_kg DECIMAL(10,2),
  empresa_id VARCHAR(36) NOT NULL REFERENCES empresas_grupo(id) ON DELETE RESTRICT,
  transportadora_id VARCHAR(36) REFERENCES transportadoras(id) ON DELETE SET NULL,
  tipo "TipoTransporte" NOT NULL DEFAULT 'TERCEIRO',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (empresa_id, placa)
);
CREATE INDEX idx_veiculos_transportadora ON veiculos(transportadora_id);

CREATE TABLE remessa_contadores (
  empresa_id VARCHAR(36) NOT NULL,
  ano INT NOT NULL,
  ultimo_numero INT NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, ano)
);

CREATE TABLE remessas (
  id VARCHAR(36) PRIMARY KEY,
  empresa_id VARCHAR(36) NOT NULL REFERENCES empresas_grupo(id) ON DELETE RESTRICT,
  ano INT NOT NULL,
  sequencial INT NOT NULL,
  numero VARCHAR(30) NOT NULL,
  cliente_id VARCHAR(36) NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  empreendimento_id VARCHAR(36) NOT NULL REFERENCES empreendimentos(id) ON DELETE RESTRICT,
  origem VARCHAR(255),
  torre_id VARCHAR(36) REFERENCES torres(id) ON DELETE SET NULL,
  pavimento_id VARCHAR(36) REFERENCES pavimentos(id) ON DELETE SET NULL,
  etapa VARCHAR(100),
  endereco_entrega TEXT NOT NULL,
  status "StatusRemessa" NOT NULL DEFAULT 'RASCUNHO',
  proximo_numero_carregamento INT NOT NULL DEFAULT 1,
  data_saida_prevista TIMESTAMP,
  data_entrega_prevista TIMESTAMP,
  observacoes TEXT,
  criado_por_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE (empresa_id, ano, sequencial),
  UNIQUE (empresa_id, numero)
);
CREATE INDEX idx_remessas_empreendimento_status ON remessas(empreendimento_id, status);
CREATE INDEX idx_remessas_cliente ON remessas(cliente_id);
CREATE INDEX idx_remessas_status ON remessas(status);

CREATE TABLE itens_remessa (
  id VARCHAR(36) PRIMARY KEY,
  remessa_id VARCHAR(36) NOT NULL REFERENCES remessas(id) ON DELETE RESTRICT,
  tipologia_id VARCHAR(36) NOT NULL REFERENCES tipologias(id) ON DELETE RESTRICT,
  tipo_kit "TipoKitExpedicao" NOT NULL,
  tipologia_nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(100),
  descricao VARCHAR(500) NOT NULL,
  unidade VARCHAR(20) NOT NULL DEFAULT 'kit',
  torre VARCHAR(100),
  pavimento VARCHAR(100),
  etapa VARCHAR(100),
  apartamento VARCHAR(100),
  quantidade_prevista INT NOT NULL,
  quantidade_separada INT NOT NULL DEFAULT 0,
  quantidade_conferida INT NOT NULL DEFAULT 0,
  quantidade_alocada INT NOT NULL DEFAULT 0,
  quantidade_carregada INT NOT NULL DEFAULT 0,
  quantidade_expedida INT NOT NULL DEFAULT 0,
  status "StatusItemRemessa" NOT NULL DEFAULT 'PENDENTE',
  observacao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (quantidade_prevista >= 0),
  CHECK (quantidade_separada >= 0),
  CHECK (quantidade_conferida >= 0),
  CHECK (quantidade_alocada >= 0),
  CHECK (quantidade_carregada >= 0),
  CHECK (quantidade_expedida >= 0)
);
CREATE INDEX idx_itens_remessa_remessa ON itens_remessa(remessa_id);
CREATE INDEX idx_itens_remessa_tipologia ON itens_remessa(tipologia_id);

CREATE TABLE volumes (
  id VARCHAR(36) PRIMARY KEY,
  remessa_id VARCHAR(36) NOT NULL REFERENCES remessas(id) ON DELETE RESTRICT,
  numero_volume INT NOT NULL,
  tipo "TipoVolume" NOT NULL DEFAULT 'CAIXA',
  codigo_qr VARCHAR(100),
  descricao VARCHAR(500),
  peso DECIMAL(10,3),
  lacre VARCHAR(100),
  status "StatusVolume" NOT NULL DEFAULT 'ABERTO',
  observacao TEXT,
  conferido_por_id VARCHAR(36) REFERENCES usuarios(id) ON DELETE SET NULL,
  conferido_em TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (remessa_id, numero_volume)
);
CREATE INDEX idx_volumes_remessa ON volumes(remessa_id);
CREATE INDEX idx_volumes_status ON volumes(status);

CREATE TABLE itens_volume (
  id VARCHAR(36) PRIMARY KEY,
  volume_id VARCHAR(36) NOT NULL REFERENCES volumes(id) ON DELETE RESTRICT,
  item_remessa_id VARCHAR(36) NOT NULL REFERENCES itens_remessa(id) ON DELETE RESTRICT,
  quantidade INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (quantidade > 0)
);
CREATE INDEX idx_itens_volume_volume ON itens_volume(volume_id);
CREATE INDEX idx_itens_volume_item ON itens_volume(item_remessa_id);

CREATE TABLE carregamentos (
  id VARCHAR(36) PRIMARY KEY,
  remessa_id VARCHAR(36) NOT NULL REFERENCES remessas(id) ON DELETE RESTRICT,
  numero INT NOT NULL,
  status "StatusCarregamento" NOT NULL DEFAULT 'RASCUNHO',
  transportadora_id VARCHAR(36) REFERENCES transportadoras(id) ON DELETE SET NULL,
  motorista_id VARCHAR(36) REFERENCES motoristas(id) ON DELETE SET NULL,
  veiculo_id VARCHAR(36) REFERENCES veiculos(id) ON DELETE SET NULL,
  placa VARCHAR(10),
  data_carregamento TIMESTAMP,
  data_saida TIMESTAMP,
  observacao TEXT,
  criado_por_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  liberado_por_id VARCHAR(36) REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (remessa_id, numero)
);
CREATE INDEX idx_carregamentos_remessa ON carregamentos(remessa_id);
CREATE INDEX idx_carregamentos_status ON carregamentos(status);

CREATE TABLE itens_carregamento (
  id VARCHAR(36) PRIMARY KEY,
  carregamento_id VARCHAR(36) NOT NULL REFERENCES carregamentos(id) ON DELETE RESTRICT,
  item_remessa_id VARCHAR(36) NOT NULL REFERENCES itens_remessa(id) ON DELETE RESTRICT,
  quantidade INT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (carregamento_id, item_remessa_id),
  CHECK (quantidade >= 0)
);
CREATE INDEX idx_itens_carregamento_carregamento ON itens_carregamento(carregamento_id);
CREATE INDEX idx_itens_carregamento_item ON itens_carregamento(item_remessa_id);

CREATE TABLE volumes_carregamento (
  id VARCHAR(36) PRIMARY KEY,
  carregamento_id VARCHAR(36) NOT NULL REFERENCES carregamentos(id) ON DELETE RESTRICT,
  volume_id VARCHAR(36) NOT NULL REFERENCES volumes(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (carregamento_id, volume_id)
);
CREATE INDEX idx_volumes_carregamento_carregamento ON volumes_carregamento(carregamento_id);
CREATE INDEX idx_volumes_carregamento_volume ON volumes_carregamento(volume_id);

CREATE TABLE expedicao_historico (
  id VARCHAR(36) PRIMARY KEY,
  empresa_id VARCHAR(36) NOT NULL,
  remessa_id VARCHAR(36) NOT NULL REFERENCES remessas(id) ON DELETE RESTRICT,
  carregamento_id VARCHAR(36) REFERENCES carregamentos(id) ON DELETE RESTRICT,
  tipo_evento "TipoEventoExpedicao" NOT NULL,
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50) NOT NULL,
  usuario_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  dados_antes JSONB,
  dados_depois JSONB,
  observacao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_expedicao_historico_remessa ON expedicao_historico(remessa_id, created_at);
CREATE INDEX idx_expedicao_historico_carregamento ON expedicao_historico(carregamento_id, created_at);

CREATE TABLE idempotency_keys (
  id VARCHAR(36) PRIMARY KEY,
  empresa_id VARCHAR(36) NOT NULL,
  chave VARCHAR(255) NOT NULL,
  operacao VARCHAR(100) NOT NULL,
  request_hash VARCHAR(255) NOT NULL,
  status "StatusIdempotencyKey" NOT NULL DEFAULT 'PROCESSING',
  resultado_id VARCHAR(36),
  resposta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE (empresa_id, operacao, chave)
);

-- ============================================================================
-- Regra de auditoria: histórico é append-only. Revoga UPDATE/DELETE pro
-- role de aplicação, como segunda camada de proteção além da disciplina de
-- código (nenhuma action do sistema deve tentar alterar essas tabelas).
-- Ajustar "app_user" pro nome real do role usado pela aplicação, se diferente.
-- ============================================================================
-- REVOKE UPDATE, DELETE ON expedicao_historico FROM app_user;
