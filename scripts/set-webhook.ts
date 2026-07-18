// scripts/set-webhook.ts
// Registra el webhook del bot en Telegram (produccion) o, sin argumento,
// imprime el estado actual (getWebhookInfo) para verificar (runbook, CLAUDE.md).
// Uso: npx tsx scripts/set-webhook.ts https://tu-dominio.vercel.app/api/telegram
//      npx tsx scripts/set-webhook.ts            (solo consulta el estado)
// Requiere TELEGRAM_BOT_TOKEN (y TELEGRAM_WEBHOOK_SECRET para registrar).
import { loadEnvLocal } from "@/scripts/env";
import { setWebhook, getWebhookInfo } from "@/lib/telegram/api";

async function main(): Promise<void> {
  loadEnvLocal();

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("Falta TELEGRAM_BOT_TOKEN en .env.local o en el entorno.");
    process.exit(1);
  }

  const url = process.argv[2];
  if (!url) {
    // Modo verificacion: sin URL solo se consulta el estado del webhook.
    console.log("Estado actual del webhook (para registrar pasa la URL como argumento):");
    console.log(JSON.stringify(await getWebhookInfo(), null, 2));
    return;
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Falta TELEGRAM_WEBHOOK_SECRET en .env.local o en el entorno.");
    process.exit(1);
  }

  console.log(`Registrando webhook: ${url}`);
  await setWebhook(url, secret);
  console.log("Webhook registrado. Estado actual:");
  console.log(JSON.stringify(await getWebhookInfo(), null, 2));
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
