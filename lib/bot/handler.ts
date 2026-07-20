// lib/bot/handler.ts
// Corazon del bot: procesa un update de Telegram YA autenticado (la ruta valida
// secret + allowlist + chat privado antes de llamar aqui; este modulo re-verifica
// por defensa en profundidad). Todo corre dentro de runWithDbContext con el
// cliente admin y la identidad fija del dueno (BLUEPRINT-BOT seccion 3).
//
// Filosofia: los datos no deciden, las personas si. Capturar y consultar se
// ejecuta directo; completar/actualizar se convierte en PROPUESTA que el dueno
// confirma con botones (control en codigo, no en prompt).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { runAssistant, type ToolExecutor } from "@/lib/ai/agent";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { executeTool } from "@/lib/ai/execute";
import { getProjectOptions } from "@/lib/db/projects";
import { toDateColumn } from "@/lib/utils/dates";
import { runWithDbContext } from "@/lib/db/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getBotEnv, type BotEnv } from "@/lib/bot/env";
import {
  answerCallbackQuery,
  editMessageText,
  sendChatAction,
  sendMessage,
  downloadFile,
} from "@/lib/telegram/api";
import type {
  TelegramCallbackQuery,
  TelegramMessage,
  TelegramUpdate,
  InlineKeyboardMarkup,
} from "@/lib/telegram/types";
import { transcribeAudio, isSttConfigured } from "@/lib/ai/transcribe";
import {
  registerIncomingUpdate,
  updateMessageContent,
  markMessageDone,
  saveAssistantMessage,
  getRecentMessages,
  createPendingAction,
  takePendingAction,
  discardPendingAction,
  countAssistantMessagesLast24h,
  isPaused,
  setPaused,
} from "@/lib/db/bot";

// Tope diario de respuestas del asistente (freno de gasto; BLUEPRINT-BOT sec. 6).
const DAILY_LIMIT = Number(process.env.BOT_DAILY_LIMIT) || 200;
// Limites de audio (Whisper alucina en audios casi vacios; >3 min se rechaza).
const MIN_VOICE_SECONDS = 1;
const MAX_VOICE_SECONDS = 180;
// Datos de callback de los botones: pa:<uuid>:ok | pa:<uuid>:no
const CALLBACK_RE = /^pa:([0-9a-f-]{36}):(ok|no)$/i;

/** Punto de entrada unico: procesa un update autenticado de principio a fin. */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const env = getBotEnv();
  const admin = createAdminClient();

  await runWithDbContext(
    { getClient: async () => admin, userId: env.ownerUserId },
    async () => {
      if (update.callback_query) {
        await handleCallback(update.callback_query, env);
        return;
      }
      const message = update.message;
      if (!message) return; // edited_message y otros tipos: ignorados a proposito
      await handleMessage(update.update_id, message, env);
    },
  );
}

// ---------- Mensajes (texto y voz) ----------

async function handleMessage(
  updateId: number,
  message: TelegramMessage,
  env: BotEnv,
): Promise<void> {
  // Defensa en profundidad: la ruta ya filtro por dueno y chat privado.
  if (!message.from || message.from.id !== env.ownerId) return;
  if (message.chat.type !== "private") return;
  const chatId = message.chat.id;
  const text = message.text?.trim();

  // Dedup PRIMERO, para TODO (incluidos comandos): una reentrega del mismo
  // update jamas re-ejecuta nada (ni una tarea, ni un /pausa). Cualquier
  // conflicto es duplicado; no se reprocesa (ver lib/db/bot.ts).
  let messageId: string;
  try {
    const registered = await registerIncomingUpdate({
      updateId,
      chatId,
      content: text ?? (message.voice ? "[nota de voz]" : "[mensaje no soportado]"),
    });
    if (registered.kind === "duplicate") {
      await sendMessage(
        chatId,
        "Ese mensaje ya lo estoy procesando o ya lo procese. Revisa el tablero.",
      );
      return;
    }
    messageId = registered.messageId;
  } catch (err) {
    console.error("[bot:register]", err);
    await safeSend(chatId, "No pude registrar tu mensaje. Intenta de nuevo.");
    return;
  }

  // Desde aqui, pase lo que pase, la fila 'processing' se cierra en el finally:
  // nunca queda un update colgado para siempre.
  try {
    // Comandos de control (ya deduplicados; idempotentes).
    if (text === "/start") {
      await sendMessage(
        chatId,
        "Hola. Soy el asistente de tu Tablero Divergente. Dime por texto o nota de voz que capturar, consultar o completar. Comandos: /pausa detiene el bot, /reanudar lo despierta.",
      );
      return;
    }
    if (text === "/pausa") {
      await setPaused(true);
      await sendMessage(chatId, "En pausa. No procesare nada hasta que envies /reanudar.");
      return;
    }
    if (text === "/reanudar") {
      await setPaused(false);
      await sendMessage(chatId, "Listo, estoy de vuelta. Que necesitas?");
      return;
    }
    if (await isPaused()) {
      await sendMessage(chatId, "Estoy en pausa. Envia /reanudar para despertarme.");
      return;
    }

    // Solo texto o nota de voz.
    if (!text && !message.voice) {
      await sendMessage(chatId, "Por ahora solo entiendo texto y notas de voz.");
      return;
    }

    // Frenos de gasto: tope diario + rate limit (Upstash si esta configurado;
    // el tope diario es el freno duro que NO depende de Upstash).
    if ((await countAssistantMessagesLast24h(chatId)) >= DAILY_LIMIT) {
      await sendMessage(
        chatId,
        "Alcance el tope diario de mensajes del asistente. Manana sigo; si es urgente usa el tablero web.",
      );
      return;
    }
    const limit = await checkRateLimit(`bot:${env.ownerUserId}`);
    if (!limit.success) {
      await sendMessage(chatId, "Demasiados mensajes seguidos. Dame un momento y repite.");
      return;
    }

    await sendChatAction(chatId, "typing");

    // Voz -> texto (Groq/Deepgram; Claude no acepta audio).
    let userText = text ?? "";
    let transcript: string | null = null;
    if (!text && message.voice) {
      const voice = message.voice;
      if (voice.duration < MIN_VOICE_SECONDS) {
        await sendMessage(chatId, "La nota llego casi vacia. Repitela, por favor.");
        return;
      }
      if (voice.duration > MAX_VOICE_SECONDS) {
        await sendMessage(
          chatId,
          "El audio supera los 3 minutos. Mandame una nota mas corta o escribeme el resumen.",
        );
        return;
      }
      if (!isSttConfigured()) {
        await sendMessage(
          chatId,
          "La transcripcion de voz no esta configurada (falta la llave de STT). Escribeme por texto mientras tanto.",
        );
        return;
      }
      const file = await downloadFile(voice.file_id);
      transcript = await transcribeAudio({
        data: file.data,
        filename: "voice.ogg",
        mimeType: voice.mime_type ?? "audio/ogg",
      });
      userText = transcript;
      // El historial guarda lo que realmente se entendio, no "[nota de voz]".
      await updateMessageContent(messageId, transcript);
    }

    // Cerebro compartido con propuestas interceptadas.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes("placeholder")) {
      await sendMessage(
        chatId,
        "El asistente no esta configurado (falta ANTHROPIC_API_KEY en el servidor).",
      );
      return;
    }

    const history = await getRecentMessages(chatId);
    const projects = await getProjectOptions();
    const system = buildSystemPrompt({
      today: toDateColumn(new Date()),
      projects,
      channel: "telegram",
    });

    // Intercepcion: completar/actualizar NO se ejecutan; quedan como propuesta
    // pendiente que el dueno confirma con botones (control en codigo).
    const proposals: string[] = [];
    const execute: ToolExecutor = async (name, input) => {
      if (name === "completar_tarea" || name === "actualizar_tarea") {
        if (proposals.length > 0) {
          return {
            content:
              "Ya hay una propuesta pendiente en este mensaje. Propon una sola accion y espera la confirmacion.",
            isError: true,
          };
        }
        const id = await createPendingAction({
          chatId,
          toolName: name,
          toolInput: input,
        });
        proposals.push(id);
        return {
          content:
            "Propuesta registrada. NO se ejecuto todavia: el dueno debe tocar Confirmar en los botones. Dile en una frase que confirme.",
        };
      }
      return executeTool(name, input);
    };

    const client = new Anthropic({ apiKey });
    const { reply } = await runAssistant({
      client,
      system,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userText },
      ],
      execute,
    });

    // La respuesta cita lo transcrito para que el dueno detecte errores de oido.
    let finalReply = reply;
    if (transcript) {
      const shown =
        transcript.length > 220 ? `${transcript.slice(0, 220)}...` : transcript;
      finalReply = `Te entendi: "${shown}"\n\n${reply}`;
    }

    const replyMarkup: InlineKeyboardMarkup | undefined = proposals.length
      ? {
          inline_keyboard: proposals.map((id) => [
            { text: "Confirmar", callback_data: `pa:${id}:ok` },
            { text: "Cancelar", callback_data: `pa:${id}:no` },
          ]),
        }
      : undefined;

    await sendMessage(chatId, finalReply, { replyMarkup });
    await saveAssistantMessage({ chatId, content: finalReply });
  } catch (err) {
    console.error("[bot:handleMessage]", err);
    await safeSend(chatId, "No pude procesar eso. Intenta de nuevo en un momento.");
  } finally {
    // Cerrar SIEMPRE la fila 'processing': ni exito ni error la dejan colgada.
    try {
      await markMessageDone(messageId);
    } catch (err) {
      console.error("[bot:markMessageDone]", err);
    }
  }
}

// ---------- Botones de confirmacion ----------

async function handleCallback(
  cb: TelegramCallbackQuery,
  env: BotEnv,
): Promise<void> {
  // Defensa en profundidad: el callback tambien es solo del dueno y de su chat privado.
  if (cb.from.id !== env.ownerId) {
    await answerCallbackQuery(cb.id).catch(() => {});
    return;
  }
  const chatId = cb.message?.chat.id ?? env.ownerId;

  const match = cb.data?.match(CALLBACK_RE);
  if (!match) {
    await answerCallbackQuery(cb.id).catch(() => {});
    return;
  }
  const [, actionId, verdict] = match;

  if (verdict === "no") {
    try {
      await discardPendingAction(actionId);
    } catch (err) {
      console.error("[bot:discardPending]", err);
    }
    await answerCallbackQuery(cb.id, "Descartado").catch(() => {});
    await appendToProposal(cb, chatId, "Descartado. No toque nada.");
    await saveAssistantMessage({
      chatId,
      content: "Propuesta descartada por el dueno.",
    }).catch(() => {});
    return;
  }

  // Confirmar: tomar (y borrar) la accion pendiente; expira a los 10 min.
  let pending: { toolName: string; toolInput: unknown } | null;
  try {
    pending = await takePendingAction(actionId, chatId);
  } catch (err) {
    console.error("[bot:takePending]", err);
    await answerCallbackQuery(cb.id, "Error").catch(() => {});
    await appendToProposal(cb, chatId, "No pude leer la propuesta. Intenta de nuevo.");
    return;
  }
  if (!pending) {
    await answerCallbackQuery(cb.id, "Expiro").catch(() => {});
    await appendToProposal(
      cb,
      chatId,
      "La propuesta expiro o ya no existe. Pidemelo de nuevo.",
    );
    return;
  }

  // Ejecucion REAL de la herramienta confirmada (zod valida dentro). El
  // resultado de la mutacion NUNCA se enmascara por un fallo posterior de
  // formato/edicion: reportar es best-effort (appendToProposal no lanza).
  let note: string;
  try {
    const result = await executeTool(pending.toolName, pending.toolInput);
    note = result.isError ? `No se pudo: ${result.content}` : `Hecho: ${result.content}`;
    await answerCallbackQuery(cb.id, result.isError ? "Fallo" : "Hecho").catch(() => {});
  } catch (err) {
    console.error("[bot:callback:execute]", err);
    note = "No se pudo completar la accion. Intenta de nuevo.";
    await answerCallbackQuery(cb.id, "Error").catch(() => {});
  }
  await appendToProposal(cb, chatId, note);
  await saveAssistantMessage({ chatId, content: note }).catch(() => {});
}

/**
 * Edita el mensaje de la propuesta anadiendo el desenlace (y quita los botones).
 * BEST-EFFORT: nunca lanza. Si el texto combinado excede el limite o la edicion
 * falla, manda el desenlace como mensaje nuevo (sendMessage parte lo largo).
 * Asi un fallo de formato jamas se confunde con "no se ejecuto la accion".
 */
async function appendToProposal(
  cb: TelegramCallbackQuery,
  chatId: number,
  note: string,
): Promise<void> {
  const original = cb.message;
  const combined =
    original?.text != null ? `${original.text}\n\n${note}` : note;
  if (original?.text != null && combined.length <= 4096) {
    try {
      await editMessageText(chatId, original.message_id, combined);
      return;
    } catch (err) {
      console.warn("[bot:editMessageText]", err);
    }
  }
  await safeSend(chatId, note);
}

/** sendMessage que nunca lanza (para caminos de error). */
async function safeSend(chatId: number, text: string): Promise<void> {
  try {
    await sendMessage(chatId, text);
  } catch (err) {
    console.error("[bot:safeSend]", err);
  }
}
