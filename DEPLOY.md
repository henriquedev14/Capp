# Deploy em Produção — ConstruApp

Guia do zero até o sistema rodando com HTTPS, domínio próprio e backup automático.

## 1. Contratar o VPS

**Recomendado:** [Vultr](https://vultr.com) — região **São Paulo**, plano "Regular" 2 vCPU / 2GB RAM (~$6/mês).

1. Criar conta, adicionar cartão
2. "Deploy New Server" → escolher **São Paulo** → imagem **Ubuntu 24.04**
3. Anotar o IP público que ele vai gerar

## 2. Apontar o domínio

1. Comprar o domínio no [registro.br](https://registro.br) (se `.com.br`) ou no registrador de sua preferência
2. No painel do domínio, criar um registro **A** apontando pro IP do servidor:
   ```
   Tipo: A
   Nome: @ (ou "www", se preferir com www)
   Valor: <IP do seu servidor>
   ```
3. Propagação leva de alguns minutos a poucas horas

## 3. Preparar o servidor

Conectar via SSH (`ssh root@<IP>`) e instalar o Docker:

```bash
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

Configurar o firewall (só libera o essencial):

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 4. Subir o código

Na sua máquina, envie o projeto pro servidor (ou clone de um repositório Git, se tiver):

```bash
# Da sua máquina Windows, usando scp (ou WinSCP se preferir interface gráfica)
scp -r C:\Users\hccr6\Desktop\erp-engenharia\erp-engenharia root@<IP>:/root/construapp
```

## 5. Configurar variáveis de ambiente

No servidor, dentro da pasta do projeto:

```bash
cd /root/construapp
cp .env.production.example .env
nano .env
```

Preencher **de verdade**:
- `POSTGRES_PASSWORD` → gerar com `openssl rand -base64 24`
- `NEXTAUTH_SECRET` → gerar com `openssl rand -base64 32`
- `NEXTAUTH_URL` → `https://seu-dominio.com.br` (o domínio real que você configurou)
- `RESEND_API_KEY` e `EMAIL_FROM` → depois de criar conta no Resend (ver seção 8)

Editar também o `Caddyfile`, trocando `seu-dominio.com.br` pelo domínio real.

## 6. Primeira subida

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d db
```

Espera uns 10 segundos pro Postgres subir de vez, depois aplica o schema e o seed inicial:

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npx prisma db push
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npm run db:seed
```

Agora sobe tudo:

```bash
docker compose -f docker-compose.prod.yml up -d
```

O Caddy vai emitir o certificado HTTPS sozinho na primeira requisição — pode levar de 10 a 60 segundos na primeira vez que alguém acessa `https://seu-dominio.com.br`.

## 7. Conferir

- Acesse `https://seu-dominio.com.br` — deve aparecer a tela de login
- Login com o `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` que você definiu no `.env`
- **Troque a senha do admin imediatamente** depois do primeiro login

## 8. E-mail transacional (Resend)

1. Criar conta em [resend.com](https://resend.com)
2. Adicionar seu domínio em "Domains" — ele mostra 3 registros DNS pra você adicionar (SPF, DKIM, etc.)
3. Depois de validado, criar uma API Key em "API Keys"
4. Colar a key no `.env` (`RESEND_API_KEY`) e reiniciar: `docker compose -f docker-compose.prod.yml up -d app`

## 9. Backup automático

```bash
chmod +x scripts/backup.sh
crontab -e
```

Adicionar a linha (roda todo dia às 3h da manhã):

```
0 3 * * * cd /root/construapp && ./scripts/backup.sh >> /var/log/construapp-backup.log 2>&1
```

Teste manual pra confirmar que funciona:

```bash
./scripts/backup.sh
ls -lh backups/
```

**Importante:** esses backups ficam no mesmo servidor. Pra proteção real contra perda do servidor inteiro (não só do banco), configure também upload periódico da pasta `backups/` pra algum storage externo (S3, Backblaze B2, ou até Google Drive via `rclone`). Se quiser, posso preparar esse passo extra depois.

## 10. Monitoramento simples (opcional, gratuito)

[UptimeRobot](https://uptimerobot.com) — cadastra `https://seu-dominio.com.br` como monitor HTTP(S), e te avisa por e-mail/WhatsApp se o sistema cair. 5 minutos de configuração, plano free já serve.

## Atualizações futuras

Sempre que eu te mandar um novo `.zip` com melhorias:

```bash
# Envia o zip novo pro servidor, substitui os arquivos, depois:
cd /root/construapp
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app

# Se o schema do banco mudou (Claude vai avisar quando isso acontecer):
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npx prisma db push
```

## Resumo de custos mensais

| Item | Custo |
|---|---|
| VPS Vultr (São Paulo, 2GB) | ~R$ 35 |
| Domínio .com.br | ~R$ 3/mês (R$ 40/ano) |
| Resend (até 3.000 e-mails/mês) | R$ 0 |
| UptimeRobot | R$ 0 |
| **Total** | **~R$ 40/mês** |
