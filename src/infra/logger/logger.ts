import pino from "pino";

/**
 * Logger estruturado do sistema — Tarefa 1.1.5 do Plano Mestre.
 *
 * Saída em JSON (um objeto por linha), com nível e timestamp ISO. Em
 * produção isso vai direto pro stdout do container — o Docker/GCP já
 * coleta isso; quando tivermos um agregador de log (Loki, CloudWatch,
 * etc.), é só apontar pra saída do container, sem mudar nada aqui.
 *
 * Uso: sempre passar um objeto de contexto como primeiro argumento, não
 * só uma string — é isso que torna o log pesquisável de verdade.
 *
 *   logger.error({ orcamentoId, erro: e.message }, "falha ao gerar proposta");
 *   logger.info({ empreendimentoId, fornecedorIds }, "tabela de preços aplicada");
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});
