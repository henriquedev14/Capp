"use client";

import * as Sentry from "@sentry/nextjs";

console.log("[SentryClientInit] modulo carregado. DSN recebido:", process.env.NEXT_PUBLIC_SENTRY_DSN);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  debug: true,
});

const eventId = Sentry.captureException(new Error("Teste Sentry 6 - captureException direto"));
console.log("[SentryClientInit] captureException chamado, eventId:", eventId);
Sentry.flush(3000).then(() => console.log("[SentryClientInit] flush concluido"));

export function SentryClientInit() {
  return null;
}
