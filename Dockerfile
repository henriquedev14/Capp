# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: deps — instala dependências isoladamente para aproveitar cache
# ==============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# libc6-compat: compatibilidade geral de binários nativos no Alpine.
# openssl: exigido pelo Query Engine do Prisma (prisma-client-js) para
# detectar a versão correta de libssl em tempo de execução no musl libc.
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps

# ==============================================================================
# Stage 2: builder — gera o Prisma Client e builda a aplicação Next.js
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# O Prisma Client precisa existir ANTES do `next build`, já que o código da
# aplicação importa tipos gerados a partir de src/generated/prisma.
RUN npx prisma generate

RUN --mount=type=cache,target=/app/.next/cache npm run build

# ==============================================================================
# Stage 3: runner — imagem final, mínima, com apenas o necessário para rodar
# a aplicação. Migrations e seed NÃO rodam aqui — são tarefas administrativas
# pontuais, melhor executadas pelo serviço "migrate" do docker-compose.yml,
# que reaproveita o estágio "builder" (completo, com Prisma CLI, tsx e todo
# o código-fonte) via `docker compose run --rm migrate ...`.
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# poppler-utils: pdftotext, usado na extração de cotações de fornecedor em PDF.
# chromium + libs: usado pelo puppeteer-core pra gerar a Proposta Comercial
# a partir do template HTML oficial (renderiza e imprime em PDF via
# navegador headless — só assim dá pra preservar o layout/fontes exatos do
# template, ao contrário de recriar em código). Testado e validado nessa
# mesma combinação Alpine antes de entrar aqui (15/07/2026).
RUN apk add --no-cache openssl poppler-utils chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Saída standalone: já contém um node_modules mínimo com só o que a
# aplicação realmente usa (incluindo o Prisma Client gerado).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
