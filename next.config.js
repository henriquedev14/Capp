/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gera um build autocontido (.next/standalone) com apenas os arquivos
  // e dependências realmente usados — essencial para imagens Docker
  // pequenas e inicialização rápida em produção.
  output: "standalone",
  // Necessário para que o Prisma Client (gerado via prisma-client-js) e o
  // driver "pg" funcionem corretamente em Server Components/Actions sem
  // serem processados pelo bundler do Next.js.
  serverExternalPackages: ["@prisma/client", "pg"],
  // Limite padrão de Server Actions é 1MB — pequeno demais para anexar
  // contratos/plantas/fotos no Empreendimento. Sobe para 20MB.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // Headers de segurança aplicados a toda resposta — mitigam clickjacking
  // (X-Frame-Options), MIME-sniffing (X-Content-Type-Options), e vazamento
  // de referrer entre domínios. Não é uma CSP completa (isso exigiria
  // mapear cada script/estilo externo usado e testar caso a caso — fica
  // pro módulo de Segurança da Informação), mas já cobre os riscos mais
  // simples de mitigar sem quebrar nada.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
