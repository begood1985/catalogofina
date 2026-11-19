// Configuração do catálogo FinaSub para Vercel e desenvolvimento local.
// O pacote @lovable.dev/vite-tanstack-config já inclui os plugins de TanStack,
// React, Tailwind e Nitro. Não registre esses plugins novamente.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // O runtime do catálogo publicado na Vercel precisa usar Vercel Functions
  // em vez do preset Cloudflare utilizado como padrão pelo scaffold.
  nitro: {
    preset: process.env.VERCEL ? "vercel" : undefined,
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
