-- Migration: Orçamentação Profissional
-- Tables: OrcamentoJornada, OrcamentoHistorico, OrcamentoNegociacao
-- Fields: Novos campos em Orcamento, ItemServicoOrcamento, ItemMaterialOrcamento, Cotacao

-- ============================================================================
-- 1. Adicionar novos campos em Orcamento
-- ============================================================================

ALTER TABLE orcamentos 
ADD COLUMN custo_direto DECIMAL(12,2),
ADD COLUMN custo_indireto DECIMAL(12,2),
ADD COLUMN margem_prevista DECIMAL(12,2),
ADD COLUMN responsavel_id VARCHAR(36),
ADD COLUMN data_prazo DATETIME,
ADD COLUMN levantamento_eletrico_ids TEXT,
ADD COLUMN levantamento_materiais_ids TEXT,
ADD COLUMN status_aprovacao VARCHAR(50) DEFAULT 'NAO_ENVIADO',
ADD COLUMN aprovado_por_id VARCHAR(36),
ADD COLUMN data_aprovacao DATETIME,
ADD COLUMN motivo_devolucao TEXT;

-- Adicionar índices
CREATE INDEX idx_orcamentos_responsavel_id ON orcamentos(responsavel_id);
CREATE INDEX idx_orcamentos_status_aprovacao ON orcamentos(status_aprovacao);

-- Adicionar FKs
ALTER TABLE orcamentos 
ADD CONSTRAINT fk_orcamentos_responsavel 
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL;
  
ALTER TABLE orcamentos 
ADD CONSTRAINT fk_orcamentos_aprovado_por 
  FOREIGN KEY (aprovado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. Adicionar novos campos em ItemServicoOrcamento
-- ============================================================================

ALTER TABLE itens_servico_orcamento 
ADD COLUMN situacao VARCHAR(50) DEFAULT 'NORMAL',
ADD COLUMN justificativa TEXT,
ADD COLUMN tier_multiplicador_id VARCHAR(36),
ADD COLUMN ajuste_manual DECIMAL(12,2),
ADD COLUMN ajuste_motivo TEXT,
ADD COLUMN memoria_calculo TEXT;

-- Adicionar FK
ALTER TABLE itens_servico_orcamento 
ADD CONSTRAINT fk_itens_servico_tier_multiplicador 
  FOREIGN KEY (tier_multiplicador_id) REFERENCES tier_multiplicadores(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. Adicionar novos campos em ItemMaterialOrcamento
-- ============================================================================

ALTER TABLE itens_material_orcamento 
ADD COLUMN situacao VARCHAR(50) DEFAULT 'PENDENTE_PRECIFICACAO',
ADD COLUMN justificativa TEXT,
ADD COLUMN fornecedor_selecionado_id VARCHAR(36),
ADD COLUMN cotacao_item_id VARCHAR(36),
ADD COLUMN preco_base DECIMAL(10,4),
ADD COLUMN frete DECIMAL(10,2) DEFAULT 0,
ADD COLUMN impostos DECIMAL(10,2) DEFAULT 0,
ADD COLUMN perdas DECIMAL(10,2) DEFAULT 0,
ADD COLUMN memoria_calculo TEXT;

-- Adicionar índice
CREATE INDEX idx_itens_material_fornecedor_selecionado ON itens_material_orcamento(fornecedor_selecionado_id);

-- Adicionar FKs
ALTER TABLE itens_material_orcamento 
ADD CONSTRAINT fk_itens_material_fornecedor_selecionado 
  FOREIGN KEY (fornecedor_selecionado_id) REFERENCES fornecedores(id) ON DELETE SET NULL;
  
ALTER TABLE itens_material_orcamento 
ADD CONSTRAINT fk_itens_material_cotacao_item 
  FOREIGN KEY (cotacao_item_id) REFERENCES cotacao_itens(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. Adicionar novos campos em Cotacao
-- ============================================================================

ALTER TABLE cotacoes 
ADD COLUMN responsavel_id VARCHAR(36),
ADD COLUMN data_prazo DATETIME,
ADD COLUMN frete DECIMAL(10,2),
ADD COLUMN condicao_pagamento VARCHAR(100),
ADD COLUMN disponibilidade VARCHAR(100),
ADD COLUMN selecionada_em DATETIME,
ADD COLUMN selecionada_por_id VARCHAR(36),
ADD COLUMN motivo_selecao TEXT,
ADD COLUMN historico_precos TEXT;

-- Adicionar FKs
ALTER TABLE cotacoes 
ADD CONSTRAINT fk_cotacoes_responsavel 
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL;
  
ALTER TABLE cotacoes 
ADD CONSTRAINT fk_cotacoes_selecionada_por 
  FOREIGN KEY (selecionada_por_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Adicionar relacionamento reverso em CotacaoItem
-- ============================================================================
-- Não precisa de mudança de schema, é só um relacionamento lógico no Prisma

-- ============================================================================
-- 6. Criar tabela OrcamentoJornada
-- ============================================================================

CREATE TABLE orcamento_jornada (
  id VARCHAR(36) PRIMARY KEY,
  orcamento_id VARCHAR(36) NOT NULL,
  etapa VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'NAO_INICIADA',
  responsavel_id VARCHAR(36),
  data_inicio DATETIME,
  data_prevista DATETIME,
  data_conclusao DATETIME,
  motivo_bloqueio TEXT,
  pendencias TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_orcamento_jornada_orcamento 
    FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_orcamento_jornada_responsavel 
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  
  UNIQUE KEY uk_orcamento_jornada_etapa (orcamento_id, etapa),
  INDEX idx_orcamento_jornada_status (orcamento_id, status)
);

-- ============================================================================
-- 7. Criar tabela OrcamentoHistorico
-- ============================================================================

CREATE TABLE orcamento_historico (
  id VARCHAR(36) PRIMARY KEY,
  orcamento_id VARCHAR(36) NOT NULL,
  tipo_alteracao VARCHAR(100) NOT NULL,
  recurso_tipo VARCHAR(50),
  recurso_id VARCHAR(36),
  valor_anterior TEXT,
  valor_novo TEXT,
  justificativa TEXT,
  registrado_por_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_orcamento_historico_orcamento 
    FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_orcamento_historico_registrado_por 
    FOREIGN KEY (registrado_por_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  
  INDEX idx_orcamento_historico_data (orcamento_id, created_at),
  INDEX idx_orcamento_historico_tipo (tipo_alteracao)
);

-- ============================================================================
-- 8. Criar tabela OrcamentoNegociacao
-- ============================================================================

CREATE TABLE orcamento_negociacoes (
  id VARCHAR(36) PRIMARY KEY,
  cotacao_id VARCHAR(36) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  data_resposta DATETIME,
  registrado_por_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_orcamento_negociacoes_cotacao 
    FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id) ON DELETE CASCADE,
  CONSTRAINT fk_orcamento_negociacoes_registrado_por 
    FOREIGN KEY (registrado_por_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  
  INDEX idx_orcamento_negociacoes_data (cotacao_id, created_at)
);

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
