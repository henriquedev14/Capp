#!/bin/sh
# Backup diário do banco Postgres do ConstruApp.
# Mantém os últimos 30 dias, apaga o resto automaticamente.
#
# Uso (rodar na pasta do projeto, onde está o docker-compose.prod.yml):
#   ./scripts/backup.sh
#
# Pra automatizar (recomendado): adiciona no crontab do servidor,
# rodando todo dia às 3h da manhã:
#   crontab -e
#   0 3 * * * cd /caminho/do/projeto && ./scripts/backup.sh >> /var/log/construapp-backup.log 2>&1

set -e

PASTA_BACKUP="./backups"
DATA=$(date +%Y-%m-%d_%H-%M-%S)
ARQUIVO="$PASTA_BACKUP/construapp_$DATA.sql.gz"
DIAS_RETENCAO=30

mkdir -p "$PASTA_BACKUP"

echo "[$(date)] Iniciando backup..."

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U erp erp_engenharia | gzip > "$ARQUIVO"

echo "[$(date)] Backup salvo em $ARQUIVO ($(du -h "$ARQUIVO" | cut -f1))"

# Remove backups mais antigos que DIAS_RETENCAO dias
find "$PASTA_BACKUP" -name "construapp_*.sql.gz" -mtime +$DIAS_RETENCAO -delete

echo "[$(date)] Backup concluído. Retenção: $DIAS_RETENCAO dias."
