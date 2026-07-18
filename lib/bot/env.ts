// lib/bot/env.ts
// Configuracion del bot con FAIL-FAST (BLUEPRINT-BOT seccion 6): si falta o es
// invalida una variable, el bot no arranca y dice CUAL falta. Evita el bug
// silencioso Number(undefined) = NaN que haria que el bot ignore incluso al dueno.
import "server-only";

export interface BotEnv {
  botToken: string;
  webhookSecret: string;
  /** id numerico de Telegram del dueno (allowlist de un solo valor). */
  ownerId: number;
  /** uuid del dueno en auth.users (identidad de todas las escrituras del bot). */
  ownerUserId: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readEnv(): { env: BotEnv | null; missing: string[] } {
  const missing: string[] = [];
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const ownerIdRaw = process.env.TELEGRAM_OWNER_ID?.trim();
  const ownerUserId = process.env.OWNER_USER_ID?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!botToken || botToken.includes("placeholder"))
    missing.push("TELEGRAM_BOT_TOKEN");
  if (!webhookSecret || webhookSecret.includes("placeholder"))
    missing.push("TELEGRAM_WEBHOOK_SECRET");
  const ownerId = Number(ownerIdRaw);
  if (!ownerIdRaw || !Number.isInteger(ownerId) || ownerId <= 0)
    missing.push("TELEGRAM_OWNER_ID");
  if (!ownerUserId || !UUID_RE.test(ownerUserId)) missing.push("OWNER_USER_ID");
  if (!serviceKey || serviceKey.includes("placeholder"))
    missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) return { env: null, missing };
  return {
    env: {
      botToken: botToken as string,
      webhookSecret: webhookSecret as string,
      ownerId,
      ownerUserId: ownerUserId as string,
    },
    missing,
  };
}

/** True cuando TODAS las variables del bot estan presentes y con forma valida. */
export function isBotConfigured(): boolean {
  return readEnv().missing.length === 0;
}

/** Variables que faltan (para logs de diagnostico; nunca exponer al cliente). */
export function botConfigMissing(): string[] {
  return readEnv().missing;
}

/** Configuracion validada. Lanza con la lista exacta de faltantes. */
export function getBotEnv(): BotEnv {
  const { env, missing } = readEnv();
  if (!env) {
    throw new Error(
      `Bot sin configurar. Variables faltantes o invalidas: ${missing.join(", ")}`,
    );
  }
  return env;
}
