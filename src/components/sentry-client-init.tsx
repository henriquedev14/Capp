"use client";

import * as Sentry from "@sentry/nextjs";

console.log("[SentryClientInit] modulo carregado. DSN recebido:", process.env.NEXT_PUBLIC_SENTRY_DSN);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  debug: true,
});

export function SentryClientInit() {
  return null;
}
