import type { Metadata } from "next";

import "./globals.css";
import { SessionProvider } from "@/features/auth/components/session-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AutoLogoutProvider } from "@/features/auth/components/auto-logout-provider";

// Antes usava next/font/google (Inter), que baixa a fonte do
// fonts.googleapis.com durante o build — se a rede do ambiente de build
// falhar (comum em Docker), o Next.js tenta 3x e cada tentativa adiciona
// ~40s ao build. Trocado por uma pilha de fontes de sistema visualmente
// muito próxima da Inter, sem nenhuma dependência de rede no build.

export const metadata: Metadata = {
  title: "ConstruApp — by HGI Group",
  description: "Gestão de empreendimentos e industrialização de kits elétricos e hidráulicos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionProvider>
            <AutoLogoutProvider>{children}</AutoLogoutProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
