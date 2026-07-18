// scripts/dev-bot.ts
// PUENTE de desarrollo local: en vez de exponer localhost a internet, hace
// long polling (getUpdates) contra Telegram y reenvia cada update por POST al
// endpoint local del webhook, con el mismo header secreto que enviaria Telegram.
// IMPORTANTE: en local TELEGRAM_BOT_TOKEN debe ser el del BOT DE DESARROLLO
// (nunca el de produccion). Webhook y getUpdates son excluyentes, y este
// script BORRA el webhook del bot cuyo token use: con el token de produccion
// dejarias el bot real sin webhook.
// Uso: npx tsx scripts/dev-bot.ts   (con `npm run dev` corriendo en paralelo)
import { loadEnvLocal } from "@/scripts/env";
import { deleteWebhook, getMe, getUpdates } from "@/lib/telegram/api";
import type { TelegramUpdate } from "@/lib/telegram/types";

/** Espera ms milisegundos (para reintentos y pausas del loop). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

// Flag global de cierre: SIGINT lo apaga y los loops terminan solos.
let running = true;

/**
 * Reenvia un update al webhook local. Si el servidor esta apagado (el fetch
 * lanza), reintenta el MISMO update cada 3 s hasta entregarlo: asi no se
 * pierde ningun mensaje mientras arranca `npm run dev`.
 * Devuelve true si se entrego (cualquier status HTTP cuenta como entregado).
 */
async function forwardUpdate(
  update: TelegramUpdate,
  targetUrl: string,
  secret: string,
): Promise<boolean> {
  while (running) {
    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": secret,
        },
        body: JSON.stringify(update),
      });
      console.log(`update ${update.update_id} -> ${res.status}`);
      return true;
    } catch {
      console.warn(
        `update ${update.update_id}: el servidor local no responde; reintento en 3 s...`,
      );
      await sleep(3000);
    }
  }
  // Ctrl+C durante el reintento: no se entrego; Telegram lo reenviara al volver.
  return false;
}

async function main(): Promise<void> {
  loadEnvLocal();

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!process.env.TELEGRAM_BOT_TOKEN || !secret) {
    console.error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET en .env.local.");
    process.exit(1);
  }

  const targetUrl = process.env.DEV_WEBHOOK_URL || "http://localhost:3000/api/telegram";

  // Cierre limpio: el primer Ctrl+C deja terminar el poll en curso (hasta 30 s);
  // el segundo fuerza la salida inmediata.
  process.on("SIGINT", () => {
    if (!running) {
      console.log("\nSalida forzada.");
      process.exit(0);
    }
    running = false;
    console.log("\nCerrando... (espera el poll actual o Ctrl+C de nuevo para forzar)");
  });

  const me = await getMe();
  console.log(`Bot conectado: @${me.username ?? me.id}`);

  // Webhook y getUpdates son excluyentes: sin borrar el webhook, getUpdates da 409.
  await deleteWebhook();
  console.log(`Webhook borrado. Reenviando updates a ${targetUrl}`);
  console.log("Escuchando (Ctrl+C para salir)...");

  let offset: number | undefined;
  while (running) {
    let updates: TelegramUpdate[];
    try {
      updates = await getUpdates(offset);
    } catch (error) {
      if (!running) break;
      console.warn(
        "getUpdates fallo (se reintenta en 3 s):",
        error instanceof Error ? error.message : error,
      );
      await sleep(3000);
      continue;
    }
    for (const update of updates) {
      const delivered = await forwardUpdate(update, targetUrl, secret);
      if (!delivered) break;
      // Solo se avanza el offset cuando el update YA se entrego al local:
      // el proximo getUpdates(offset) es lo que lo confirma ante Telegram.
      offset = update.update_id + 1;
    }
  }
  console.log("Puente detenido.");
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
