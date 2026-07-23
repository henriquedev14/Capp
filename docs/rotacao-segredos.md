# Rotação de Segredos — ConstruApp

**Tarefa 1.2.5 do Plano Mestre.** Guia prático: o que fazer se um segredo vazar, ou por rotina de segurança.

## Onde os segredos vivem

- **Produção (VM):** `~/erp-engenharia/.env` — permissão restrita a `600` (só o dono lê), nunca commitado no Git.
- **Local (staging):** `.env` na pasta do projeto no seu computador — mesmo cuidado, nunca commitar.
- Os arquivos `.env.example` e `.env.production.example` são só modelos (sem segredo real) — esses SIM ficam no Git, de propósito.

## Checklist geral de rotação (qualquer segredo)

1. Gerar o novo valor.
2. Atualizar o `.env` da VM (produção).
3. Recriar o container `app` pra ele ler o valor novo: `docker compose -f docker-compose.prod.yml up -d --force-recreate app`.
4. Atualizar também o `.env` do staging local, se aplicável (nem todo segredo precisa — ex: senha do Postgres local pode continuar sendo outra, já que é um banco totalmente separado).
5. Confirmar que o sistema continua funcionando (login, geração de proposta) antes de considerar concluído.

## Por segredo

### `NEXTAUTH_SECRET`
- **O que é:** chave usada pra assinar as sessões (JWT) de login.
- **Se rotacionar:** todo usuário logado é deslogado na hora (a sessão antiga não valida mais com a chave nova) — combine um horário de baixo uso.
- **Gerar novo valor:** `openssl rand -base64 32` (na VM) ou peça pra mim gerar via Node, como já fizemos antes.
- **Quando rotacionar:** se houver suspeita de vazamento, ou por rotina a cada 6-12 meses.

### `POSTGRES_PASSWORD`
- **O que é:** senha do usuário `erp` no banco Postgres.
- **Cuidado:** precisa trocar em 2 lugares ao mesmo tempo — o `.env` E o próprio banco (senão o app não consegue mais conectar). Processo:
  1. Trocar a senha dentro do Postgres: `docker compose -f docker-compose.prod.yml exec db psql -U erp -d erp_engenharia -c "ALTER USER erp WITH PASSWORD 'senha_nova_aqui';"`
  2. Atualizar `POSTGRES_PASSWORD` no `.env` com o mesmo valor.
  3. Recriar os containers: `docker compose -f docker-compose.prod.yml up -d --force-recreate`.
- **Quando rotacionar:** suspeita de vazamento, ou troca de pessoa com acesso à VM.

### `RESEND_API_KEY`
- **O que é:** chave da API de envio de e-mail (quando configurada de verdade).
- **Rotacionar:** gera uma nova chave direto no painel do Resend (resend.com), revoga a antiga lá, atualiza o `.env`.
- **Quando rotacionar:** suspeita de vazamento, ou a cada troca de responsável pelo envio de e-mail.

### `NEXT_PUBLIC_SENTRY_DSN`
- **Não é segredo sensível** (é seguro esse valor ficar público — só permite ENVIAR erro pro projeto, não ler nada). Não precisa de rotação por segurança, só trocaria se recriasse o projeto no Sentry.

### `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- **Só usado uma vez**, na primeira criação do banco (via seed). Depois que o admin real troca a própria senha pelo sistema, esses valores no `.env` não têm mais efeito nenhum — não precisam de rotação contínua.

## Se um segredo vazar de verdade (ex: `.env` foi parar em algum lugar errado)

1. Rotaciona **todos** os segredos daquele `.env`, não só o que você acha que vazou — se um vazou, trate o arquivo inteiro como comprometido.
2. Verifica o log de segurança (`/seguranca` no sistema) por atividade suspeita no período.
3. Se o vazamento foi via Git por engano, o segredo precisa ser trocado mesmo que o commit seja revertido — uma vez exposto, nunca mais é seguro reusar aquele valor (histórico do Git é possível de recuperar mesmo "apagado").

## Housekeeping (feito na Tarefa 1.2.5)

- `.env` de produção estava com permissão `644` (qualquer usuário do sistema conseguia ler) — corrigido pra `600` (só o dono).
- Encontrados e removidos `.env.save` e `.env.save.1` — cópias antigas esquecidas na VM, com segredos reais desatualizados, nunca commitadas mas ainda arriscadas por estarem no disco sem necessidade.
