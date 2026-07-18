-- ============================================================================
-- Migração manual: idempotência real de "Gerar contas fixas do mês"
-- ============================================================================
-- Contexto: gerarContasFixasDoMes() usava findFirst-depois-create (checagem
-- por código) pra evitar duplicar lançamento do mesmo modelo no mesmo mês.
-- Isso não é atômico — sob concorrência (2 cliques, 2 abas, retry de rede)
-- as duas chamadas podem passar pela checagem antes de qualquer uma criar
-- o registro, duplicando o lançamento.
--
-- Correção: 2 colunas novas (ano_referencia, mes_referencia) + constraint
-- única em (conta_fixa_modelo_id, ano_referencia, mes_referencia). O Postgres
-- garante a unicidade no próprio INSERT — não existe mais janela de corrida.
--
-- Este script SÓ faz o backfill dos registros de FIXA que já existem, com
-- base no dataVencimento atual deles. `prisma db push` já deve ter criado as
-- colunas (nulas) e a constraint antes de rodar isto — como não há nenhuma
-- duplicata hoje (confirmado por consulta em produção em 15/07/2026), o
-- backfill não viola a constraint.
--
-- ORDEM: 1) prisma db push  2) este script  3) build + deploy
-- ============================================================================

BEGIN;

UPDATE contas_pagar
SET
  ano_referencia = EXTRACT(YEAR FROM data_vencimento)::int,
  mes_referencia = EXTRACT(MONTH FROM data_vencimento)::int
WHERE conta_fixa_modelo_id IS NOT NULL
  AND ano_referencia IS NULL;

-- Conferência: não deve sobrar nenhuma FIXA sem ano/mes de referência.
DO $$
DECLARE
  restantes INT;
BEGIN
  SELECT count(*) INTO restantes
  FROM contas_pagar
  WHERE conta_fixa_modelo_id IS NOT NULL
    AND (ano_referencia IS NULL OR mes_referencia IS NULL);

  IF restantes > 0 THEN
    RAISE EXCEPTION 'Backfill incompleto: % linha(s) FIXA ainda sem ano/mes de referência', restantes;
  END IF;
END $$;

COMMIT;
