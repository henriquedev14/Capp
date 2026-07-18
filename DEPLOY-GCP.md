# Deploy em Produção — Google Cloud (GCP)

Este guia substitui as seções 1-3 do `DEPLOY.md` original (que eram específicas
da Vultr). Da seção 4 em diante, os passos são idênticos — os arquivos
(`docker-compose.prod.yml`, `Caddyfile`, `scripts/backup.sh`) já são
genéricos e funcionam em qualquer servidor Linux com Docker, Google incluso.

## 1. Ativar faturamento e criar o projeto

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Se pedir, ative o faturamento — você ganha **US$ 300 de crédito grátis
   por 90 dias** por ser conta nova. Precisa de um cartão de crédito pra
   verificação, mas não é cobrado nada até o crédito acabar ou os 90 dias
   passarem (e mesmo assim, avisa antes de cobrar de verdade)
3. Crie um projeto novo: menu superior → "Novo Projeto" → nome
   "construapp" (ou o que preferir)

## 2. Ativar a API do Compute Engine

No menu lateral: **Compute Engine** → se for a primeira vez, ele pede pra
ativar a API — clica em "Ativar" e espera uns 30 segundos.

## 3. Criar a máquina virtual (VM)

**Compute Engine → Instâncias de VM → Criar Instância**

Preencher:

| Campo | Valor |
|---|---|
| Nome | `construapp-producao` |
| Região | **`southamerica-east1` (São Paulo)** |
| Zona | qualquer uma (ex: `southamerica-east1-a`) |
| Tipo de máquina | **`e2-medium`** (2 vCPU, 4 GB RAM) |
| Disco de inicialização | Clicar em "Trocar" → **Ubuntu → Ubuntu 24.04 LTS** → 20 GB (padrão já serve) |
| Firewall | Marcar **"Permitir tráfego HTTP"** e **"Permitir tráfego HTTPS"** |

Clicar em **Criar**. Em ~30 segundos a VM está no ar com um IP externo (efêmero por padrão).

## 4. Reservar IP externo fixo

Por padrão, o IP muda se a VM reiniciar — isso quebraria o domínio apontado.
Fixar é grátis enquanto a VM estiver ligada:

1. **VPC de Rede → Endereços IP externos**
2. Encontre o IP da sua VM (`construapp-producao`) na lista, com tipo "Efêmero"
3. Clique nos 3 pontinhos → **"Promover para estático"**
4. Dê um nome (ex: `ip-construapp`) → Reservar

Esse é o IP que você vai usar no DNS.

## 5. Apontar o domínio

No painel do seu domínio (registro.br ou onde comprou):

```
Tipo: A
Nome: @ (ou "www")
Valor: <o IP estático que você acabou de reservar>
```

## 6. Conectar na VM

O jeito mais simples — sem precisar configurar chave SSH nem nada:

**Compute Engine → Instâncias de VM** → clique no botão **"SSH"** ao lado da
sua instância. Abre um terminal direto no navegador, já autenticado.

## 7. Instalar Docker

Dentro do terminal SSH do navegador:

```bash
curl -fsSL https://get.docker.com | sh
sudo apt install -y docker-compose-plugin
sudo usermod -aG docker $USER
```

Feche e reabra a sessão SSH (clica em SSH de novo) pra aplicar a permissão de grupo.

## 8. Enviar o projeto

O jeito mais simples pelo navegador: clique na engrenagem ⚙️ no canto do
terminal SSH → **"Fazer upload de arquivo"** → envie o `.zip` do projeto.

```bash
# Depois de subir o zip, descompacta:
unzip erp-engenharia.zip -d construapp
cd construapp/erp-engenharia
```

## 9. Configurar variáveis de ambiente

```bash
cp .env.production.example .env
nano .env
```

Preencher (mesma coisa do guia anterior):
- `POSTGRES_PASSWORD` → `openssl rand -base64 24`
- `NEXTAUTH_SECRET` → `openssl rand -base64 32`
- `NEXTAUTH_URL` → `https://seu-dominio.com.br`
- `RESEND_API_KEY` / `EMAIL_FROM` → deixa em branco por enquanto (recurso ainda não implementado no sistema)

Editar o `Caddyfile` trocando `seu-dominio.com.br` pelo domínio real.

## 10. Primeira subida

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d db

# espera uns 10s o postgres subir de vez, depois:
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npx prisma db push
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npm run db:seed

docker compose -f docker-compose.prod.yml up -d
```

O Caddy emite o certificado HTTPS sozinho na primeira visita ao domínio —
pode levar até 1 minuto na primeira vez.

## 11. Conferir

Acesse `https://seu-dominio.com.br` — deve aparecer a tela de login. Entra
com o `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` do `.env` e **troca a senha
imediatamente**.

## 12. Backup automático

Igual ao guia anterior:

```bash
chmod +x scripts/backup.sh
crontab -e
```

```
0 3 * * * cd ~/construapp/erp-engenharia && ./scripts/backup.sh >> /var/log/construapp-backup.log 2>&1
```

**Extra recomendado no Google Cloud:** como você já está na plataforma,
vale configurar **snapshots automáticos do disco inteiro** (proteção a mais,
além do backup do banco):

**Compute Engine → Instantâneos → Criar política de instantâneo** → agenda
diária, retenção de 7-14 dias. Custo pequeno (poucos reais/mês pelo espaço
extra).

## Custo mensal estimado (após o crédito grátis acabar)

| Item | Custo |
|---|---|
| VM e2-medium (São Paulo) | ~R$ 130 |
| IP estático (grátis enquanto VM ligada) | R$ 0 |
| Disco 20GB | ~R$ 8 |
| Domínio .com.br | ~R$ 3/mês |
| **Total** | **~R$ 140/mês** |

Nos primeiros ~2 meses, o crédito de US$ 300 cobre isso integralmente.

## Atualizações futuras

Mesmo processo do guia anterior — envia o zip novo, rebuild, restart:

```bash
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app

# Se o schema mudou (Claude avisa quando isso acontece):
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npx prisma db push
```
