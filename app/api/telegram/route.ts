// app/api/telegram/route.ts
// Webhook del bot de Telegram (BLUEPRINT-BOT). Orden de guardas OBLIGATORIO:
//   1. Config completa (fail-fast; sin config no hay webhook que atender).
//   2. Secret token del webhook (header exacto o 401).
//   3. Allowlist de UN solo dueno (cualquier otro: 200 vacio, silencio total,
//      sin revelar que el bot existe, sin gastar un token).
// Despues responde 200 DE INMEDIATO y procesa con waitUntil: elimina la carrera
// con los reintentos de Telegram (~10-60 s). El dedup idempotente vive en el
// handler (bot_messages.telegram_update_id).
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { waitUntil } from "@vercel/functions";
import { isBotConfigured, getBotEnv, botConfigMissing } from "@/lib/bot/env";
import { handleTelegramUpdate } from "@/lib/bot/handler";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const runtime = "nodejs";
// Hobby con Fluid compute permite hasta 300 s; el peor caso (descarga + STT +
// 6 rondas de tools) queda holgado.
export const maxDuration = 300;

/** Comparacion de tiempo constante del secret (higiene anti-timing). */
function secretMatches(received: string | null, expected: string): boolean {
  if (received === null) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  // 1. Configuracion completa o nada (los detalles solo al log del servidor).
  if (!isBotConfigured()) {
    console.error("[/api/telegram] bot sin configurar:", botConfigMissing());
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const env = getBotEnv();

  // 2. Firma del webhook (comparacion de tiempo constante).
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!secretMatches(secret, env.webhookSecret)) {
    return new NextResponse(null, { status: 401 });
  }

  // 3. Parseo + allowlist en TODOS los tipos de update que aceptamos.
  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const from =
    update.message?.from ??
    update.edited_message?.from ??
    update.callback_query?.from;
  // Remitente desconocido o tipo de update no soportado: 200 vacio, silencio.
  if (!from || from.id !== env.ownerId) {
    return NextResponse.json({ ok: true });
  }
  if (!update.message && !update.callback_query) {
    // edited_message y demas tipos se ignoran a proposito (no reprocesar ediciones).
    return NextResponse.json({ ok: true });
  }

  // Solo chat PRIVADO del dueno: si el bot es anadido a un grupo, un comando
  // del dueno alli NO debe filtrar sus datos al grupo (privacy mode no basta).
  const chat = update.message?.chat ?? update.callback_query?.message?.chat;
  if (chat && chat.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  // 4. 200 ya; el trabajo sigue en background dentro de esta invocacion.
  waitUntil(
    handleTelegramUpdate(update).catch((err) =>
      console.error("[/api/telegram]", err),
    ),
  );
  return NextResponse.json({ ok: true });
}
