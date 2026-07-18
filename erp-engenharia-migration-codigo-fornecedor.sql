-- Migration: matching por código do fornecedor na importação de cotação
-- Adiciona campo pra aprender o SKU do fornecedor por material.

ALTER TABLE produtos_fornecedor
ADD COLUMN codigo_fornecedor VARCHAR(255);

-- Um fornecedor não pode ter o mesmo código mapeado pra dois materiais
-- diferentes. NULL não conta como duplicata em Postgres, então linhas
-- ainda sem código aprendido convivem normalmente.
CREATE UNIQUE INDEX produtos_fornecedor_fornecedor_id_codigo_fornecedor_key
ON produtos_fornecedor (fornecedor_id, codigo_fornecedor);
