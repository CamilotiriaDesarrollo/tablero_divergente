// scripts/dev-bot.ts
// PUENTE de desarrollo local: en vez de exponer localhost a internet, hace
// long polling (getUpdates) contra Telegram y reenvia cada update por POST al
// endpoint local del webhook, con el mismo header secreto que enviaria Telegram.
// SEGURIDAD (BLUEPRINT-BOT sec. 6): usa EXCLUSIVAMENTE TELEGRAM_BOT_TOKEN_DEV
// (el token del bot de DESARROLLO). Nunca cae al de produccion: este script
// BORRA el webhook del bot cuyo token use, asi que con el token real dejarias
// el bot de produccion sin webhook. Si TELEGRAM_BOT_TOKEN_DEV falta, aborta.
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
 * Reenvia un update al webhook local.
 * - Si el servidor esta apagado (el fetch lanza), reintenta el MISMO update
 *   cada 3 s hasta que responda: no se pierde nada mientras arranca `npm run dev`.
 * - Solo un 2xx cuenta como ENTREGADO (avanza el offset). Un 4xx/5xx (p. ej.
 *   401 por secret distinto, 503 por bot sin configurar en el server) NO se da
 *   por entregado: se detiene el puente con un error claro para no descartar el
 *   mensaje en silencio ni avanzar el offset sobre algo que el webhook rechazo.
 * Devuelve true si el webhook acepto el update (2xx).
 */
async function forwardUpdate(
  update: TelegramUpdate,
  targetUrl: string,
  secret: string,
): Promise<boolean> {
  while (running) {
    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": secret,
        },
        body: JSON.stringify(update),
      });
    } catch {
      console.warn(
        `update ${update.update_id}: el servidor local no responde; reintento en 3 s...`,
      );
      await sleep(3000);
      continue;
    }
    if (res.ok) {
      console.log(`update ${update.update_id} -> ${res.status} OK`);
      return true;
    }
    // El webhook respondio pero rechazo el update: no avanzar el offset.
    console.error(
      `update ${update.update_id} -> ${res.status}: el webhook local lo rechazo. ` +
        "Revisa que el secret y las env vars del bot coincidan entre .env.local y el server. Deteniendo el puente.",
    );
    running = false;
    return false;
  }
  // Ctrl+C durante el reintento: no se entrego; Telegram lo reenviara al volver.
  return false;
}

async function main(): Promise<void> {
  loadEnvLocal();

  // Token del bot de DESARROLLO, obligatorio y separado del de produccion.
  const devToken = process.env.TELEGRAM_BOT_TOKEN_DEV;
  if (!devToken) {
    console.error(
      "Falta TELEGRAM_BOT_TOKEN_DEV en .env.local. Crea un bot de DESARROLLO\n" +
        "aparte en BotFather (nunca uses el token de produccion aqui): este script\n" +
        "borra el webhook del bot cuyo token use.",
    );
    process.exit(1);
  }
  // El cliente de lib/telegram/api lee TELEGRAM_BOT_TOKEN: lo apuntamos al de dev
  // SOLO en este proceso, para que jamas se toque el bot de produccion.
  process.env.TELEGRAM_BOT_TOKEN = devToken;

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Falta TELEGRAM_WEBHOOK_SECRET en .env.local.");
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
