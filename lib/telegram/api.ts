// lib/telegram/api.ts
// Cliente minimo de la Telegram Bot API con fetch nativo (sin grammY ni
// dependencias nuevas). Toda llamada que falla (ok:false o error HTTP) lanza
// Error con el description que devuelve Telegram, EXCEPTO sendChatAction, que
// es cosmetico y solo avisa por console.warn.
// NOTA: sin "server-only" a proposito: los scripts de scripts/* (tsx) tambien
// importan este modulo fuera de Next. El token nunca sale del servidor igual.
import type { InlineKeyboardMarkup, TelegramUpdate } from "@/lib/telegram/types";

/** Limite de caracteres por mensaje segun la Bot API. */
const MAX_MESSAGE_LENGTH = 4096;

/** Envoltura estandar de respuesta de la Bot API. */
interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/** Forma del objeto File que devuelve getFile. */
interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

/**
 * Token del bot. Se lee DENTRO del modulo (no en el top-level) para que el
 * build de Next no falle cuando la variable aun no existe: solo lanza al usar.
 */
function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes("placeholder")) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN no esta configurado. Define el token real del bot en .env.local (desarrollo) o en Vercel (produccion).",
    );
  }
  return token;
}

/**
 * Llama un metodo de la Bot API por POST JSON y devuelve result.
 * Lanza Error con el description de Telegram si ok:false o el HTTP falla.
 */
async function callApi<T>(method: string, payload?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const json = (await res.json().catch(() => null)) as TelegramApiResponse<T> | null;
  if (!json || !json.ok || !res.ok) {
    const description = json?.description ?? `HTTP ${res.status}`;
    throw new Error(`Telegram ${method} fallo: ${description}`);
  }
  return json.result as T;
}

/**
 * Parte un texto en trozos de maximo MAX_MESSAGE_LENGTH caracteres,
 * prefiriendo cortar en un salto de linea o espacio para no partir palabras.
 */
function splitText(text: string): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > MAX_MESSAGE_LENGTH) {
    const window = rest.slice(0, MAX_MESSAGE_LENGTH);
    let cut = window.lastIndexOf("\n");
    if (cut < MAX_MESSAGE_LENGTH / 2) cut = window.lastIndexOf(" ");
    if (cut < MAX_MESSAGE_LENGTH / 2) cut = MAX_MESSAGE_LENGTH;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\s+/, "");
  }
  if (rest.length > 0) chunks.push(rest);
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Envia un mensaje de TEXTO PLANO (sin parse_mode a proposito: asi los
 * guiones bajos, asteriscos, etc. del contenido nunca rompen el envio).
 * Si el texto supera 4096 chars se parte y se envian varios mensajes;
 * el teclado inline va solo en el ultimo.
 */
export async function sendMessage(
  chatId: number,
  text: string,
  opts?: { replyMarkup?: InlineKeyboardMarkup },
): Promise<void> {
  const chunks = splitText(text);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await callApi("sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      ...(isLast && opts?.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
    });
  }
}

/**
 * Indicador "escribiendo..." (u otra accion). NUNCA lanza: es cosmetico y un
 * fallo aqui no debe tumbar el procesamiento del mensaje.
 */
export async function sendChatAction(chatId: number, action = "typing"): Promise<void> {
  try {
    await callApi("sendChatAction", { chat_id: chatId, action });
  } catch (error) {
    console.warn("sendChatAction fallo:", error instanceof Error ? error.message : error);
  }
}

/** Responde un callback query (quita el spinner del boton pulsado). */
export async function answerCallbackQuery(id: string, text?: string): Promise<void> {
  await callApi("answerCallbackQuery", {
    callback_query_id: id,
    ...(text ? { text } : {}),
  });
}

/** Edita el texto de un mensaje ya enviado (tambien quita su teclado inline). */
export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  await callApi("editMessageText", { chat_id: chatId, message_id: messageId, text });
}

/**
 * Descarga un archivo del bot (por ejemplo una nota de voz):
 * getFile -> file_path -> descarga de api.telegram.org/file/bot<TOKEN>/<path>.
 */
export async function downloadFile(
  fileId: string,
): Promise<{ data: Uint8Array; filePath: string; fileSize?: number }> {
  const file = await callApi<TelegramFile>("getFile", { file_id: fileId });
  if (!file.file_path) {
    throw new Error(`Telegram getFile no devolvio file_path para ${fileId}`);
  }
  const res = await fetch(`https://api.telegram.org/file/bot${botToken()}/${file.file_path}`);
  if (!res.ok) {
    throw new Error(`Telegram descarga de archivo fallo: HTTP ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  return { data: new Uint8Array(buffer), filePath: file.file_path, fileSize: file.file_size };
}

/**
 * Registra el webhook. drop_pending_updates en false para no perder mensajes
 * enviados mientras el webhook estaba caido; solo los updates que el bot usa.
 */
export async function setWebhook(url: string, secretToken: string): Promise<unknown> {
  return callApi<unknown>("setWebhook", {
    url,
    secret_token: secretToken,
    drop_pending_updates: false,
    allowed_updates: ["message", "callback_query"],
  });
}

/** Borra el webhook (necesario antes de usar getUpdates en desarrollo). */
export async function deleteWebhook(): Promise<unknown> {
  return callApi<unknown>("deleteWebhook", {});
}

/** Estado actual del webhook (url, pending_update_count, last_error, etc.). */
export async function getWebhookInfo(): Promise<unknown> {
  return callApi<unknown>("getWebhookInfo", {});
}

/** Identidad del bot (sirve para validar el token al arrancar). */
export async function getMe(): Promise<{ id: number; username?: string }> {
  return callApi<{ id: number; username?: string }>("getMe", {});
}

/**
 * Long polling de updates (solo desarrollo; excluyente con el webhook).
 * Con timeout la llamada queda abierta hasta ese numero de segundos.
 */
export async function getUpdates(
  offset?: number,
  timeoutSeconds = 30,
): Promise<TelegramUpdate[]> {
  return callApi<TelegramUpdate[]>("getUpdates", {
    ...(offset !== undefined ? { offset } : {}),
    timeout: timeoutSeconds,
    // Mismos updates que el webhook, para que dev y produccion se comporten igual.
    allowed_updates: ["message", "callback_query"],
  });
}
