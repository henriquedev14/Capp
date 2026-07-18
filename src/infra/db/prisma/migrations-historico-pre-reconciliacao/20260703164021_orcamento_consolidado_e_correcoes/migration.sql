-- Renomeia os valores do enum StatusOrcamento preservando os dados
-- existentes (Postgres 10+ suporta RENAME VALUE nativamente).

-- 1) "REVISAO" não tem um valor renomeado equivalente (foi absorvido por
--    "Em levantamento") — move essas linhas para RASCUNHO antes de renomear.
UPDATE "orcamentos" SET "status" = 'RASCUNHO' WHERE "status" = 'REVISAO';

-- 2) Renomeia os 4 valores restantes.
ALTER TYPE "StatusOrcamento" RENAME VALUE 'RASCUNHO' TO 'EM_LEVANTAMENTO';
ALTER TYPE "StatusOrcamento" RENAME VALUE 'ENVIADO' TO 'ENVIADO_APROVACAO_GESTOR';
ALTER TYPE "StatusOrcamento" RENAME VALUE 'APROVADO' TO 'ORCAMENTO_APROVADO';
ALTER TYPE "StatusOrcamento" RENAME VALUE 'REPROVADO' TO 'ORCAMENTO_DEVOLVIDO';

-- Observação: o rótulo "REVISAO" fica órfão no tipo (Postgres não permite
-- remover valores de enum), mas isso é inofensivo — nenhuma linha o usa
-- mais e o Prisma nunca vai gravar esse valor de novo.
