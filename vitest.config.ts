import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Testes de caracterização são de integração (batem no banco de
    // verdade) — rodam um de cada vez pra não disputar a mesma
    // transação/dados de teste.
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
