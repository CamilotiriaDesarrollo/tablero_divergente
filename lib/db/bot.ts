// lib/db/bot.ts
// Acceso a datos del bot de Telegram (CLAUDE.md: data access centralizado).
// Server-side. Sigue el patron de lib/db/tasks.ts: cliente e identidad se
// resuelven de dbContext() (lib/db/context.ts). Este modulo corre siempre bajo
// contexto bot (service_role + user_id fijo del dueno); como service_role
// bypassa RLS, cuando ownerId() esta definido se anade .eq("user_id", ...)
// como defensa en profundidad en TODAS las consultas y mutaciones.
// No hay guard de isSupabaseConfigured: el canal del bot hace fail-fast en
// lib/supabase/admin.ts si falta configuracion (nunca degradar en silencio).
import { dbContext, ownerId } from "@/lib/db/context";
import type { Json } from "@/types/db";

/** Minutos de vida de una accion pendiente de confirmacion. */
const PENDING_ACTION_TTL_MINUTES = 10;

async function client() {
  return await dbContext().getClient();
}

async function requireUserId(): Promise<string> {
  const ctx = dbContext();
  if (ctx.userId) return ctx.userId; // bot: identidad fija del dueno
  const supabase = await ctx.getClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

// ---------- Mensajes ----------

/** Resultado de registrar un update entrante (deduplicacion del webhook). */
export type RegisterResult =
  | { kind: "new"; messageId: string }
  | { kind: "retry"; messageId: string }
  | { kind: "duplicate" };

/**
 * Registra un update de Telegram con dedupe por telegram_update_id:
 * - new: primera vez que llega (fila insertada, status 'processing').
 * - retry: ya existe y sigue 'processing' (reintento de un update a medias).
 * - duplicate: ya existe y esta 'done' (no volver a procesar).
 */
export async function registerIncomingUpdate(params: {
  updateId: number;
  chatId: number;
  content: string;
}): Promise<RegisterResult> {
  const supabase = await client();
  const userId = await requireUserId();
  // ignoreDuplicates: en conflicto NO pisa la fila existente y no devuelve fila.
  const { data, error } = await supabase
    .from("bot_messages")
    .upsert(
      {
        user_id: userId,
        chat_id: params.chatId,
        telegram_update_id: params.updateId,
        status: "processing",
        role: "user",
        content: params.content,
      },
      { onConflict: "telegram_update_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  if (data && data.length > 0) return { kind: "new", messageId: data[0].id };

  // Conflicto: el update ya estaba registrado. Decidir por su status.
  let query = supabase
    .from("bot_messages")
    .select("id, status")
    .eq("telegram_update_id", params.updateId);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw existingError;
  // Si desaparecio entre el upsert y el select (poda), tratar como duplicado.
  if (!existing) return { kind: "duplicate" };
  if (existing.status === "processing") {
    return { kind: "retry", messageId: existing.id };
  }
  return { kind: "duplicate" };
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const supabase = await client();
  let query = supabase.from("bot_messages").update({ content }).eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { error } = await query;
  if (error) throw error;
}

export async function markMessageDone(id: string): Promise<void> {
  const supabase = await client();
  let query = supabase.from("bot_messages").update({ status: "done" }).eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { error } = await query;
  if (error) throw error;
}

/** Guarda una respuesta del asistente (role 'assistant', status 'done'). */
export async function saveAssistantMessage(params: {
  chatId: number;
  content: string;
}): Promise<void> {
  const supabase = await client();
  const userId = await requireUserId();
  const { error } = await supabase.from("bot_messages").insert({
    user_id: userId,
    chat_id: params.chatId,
    role: "assistant",
    status: "done",
    content: params.content,
  });
  if (error) throw error;
}

/**
 * Historial reciente de un chat para el contexto del modelo: solo mensajes
 * 'done', los N mas nuevos (BOT_MAX_HISTORY, default 30), devueltos en orden
 * cronologico ascendente (como los espera la API de mensajes).
 */
export async function getRecentMessages(
  chatId: number,
  limit?: number,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const supabase = await client();
  const max = limit ?? (Number(process.env.BOT_MAX_HISTORY) || 30);
  let query = supabase
    .from("bot_messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .eq("status", "done");
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).reverse();
}

/** Respuestas del asistente en las ultimas 24h (limite diario de mensajes). */
export async function countAssistantMessagesLast24h(chatId: number): Promise<number> {
  const supabase = await client();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("bot_messages")
    .select("id", { count: "exact", head: true })
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .gte("created_at", since);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// ---------- Acciones pendientes de confirmacion ----------

/** Crea una accion pendiente (expira a los 10 minutos). Devuelve su id. */
export async function createPendingAction(params: {
  chatId: number;
  toolName: string;
  toolInput: unknown;
}): Promise<string> {
  const supabase = await client();
  const userId = await requireUserId();
  const expiresAt = new Date(
    Date.now() + PENDING_ACTION_TTL_MINUTES * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("bot_pending_actions")
    .insert({
      user_id: userId,
      chat_id: params.chatId,
      tool_name: params.toolName,
      // El orquestador entrega unknown; el contrato de la columna es Json.
      tool_input: params.toolInput as Json,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Consume una accion pendiente: la devuelve y la BORRA en una sola operacion
 * SOLO si existe, el chat_id coincide y no expiro. Null en cualquier otro caso
 * (no existe, chat equivocado o vencida): asi una confirmacion vieja o ajena
 * nunca ejecuta nada.
 */
export async function takePendingAction(
  id: string,
  chatId: number,
): Promise<{ toolName: string; toolInput: unknown } | null> {
  const supabase = await client();
  let query = supabase
    .from("bot_pending_actions")
    .delete()
    .eq("id", id)
    .eq("chat_id", chatId)
    .gt("expires_at", new Date().toISOString());
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query.select("tool_name, tool_input").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { toolName: data.tool_name, toolInput: data.tool_input };
}

/** Descarta una accion pendiente (el dueno respondio "no"). */
export async function discardPendingAction(id: string): Promise<void> {
  const supabase = await client();
  let query = supabase.from("bot_pending_actions").delete().eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { error } = await query;
  if (error) throw error;
}

// ---------- Estado del bot ----------

/** True si el bot esta pausado (bot_state key 'paused'). Ausente = false. */
export async function isPaused(): Promise<boolean> {
  const supabase = await client();
  let query = supabase.from("bot_state").select("value").eq("key", "paused");
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data?.value === true;
}

export async function setPaused(paused: boolean): Promise<void> {
  const supabase = await client();
  const userId = await requireUserId();
  // updated_at explicito: bot_state no tiene trigger de set_updated_at.
  const { error } = await supabase.from("bot_state").upsert(
    {
      key: "paused",
      user_id: userId,
      value: paused,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}

// ---------- Mantenimiento ----------

/**
 * Poda manual: borra bot_messages con mas de `days` dias (default 30) y las
 * acciones pendientes ya expiradas. Respaldo del job pg_cron de 0003_bot.sql
 * para entornos donde pg_cron no esta disponible.
 */
export async function pruneOldMessages(days = 30): Promise<void> {
  const supabase = await client();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const uid = ownerId();

  let messages = supabase.from("bot_messages").delete().lt("created_at", cutoff);
  if (uid) messages = messages.eq("user_id", uid);
  const { error: messagesError } = await messages;
  if (messagesError) throw messagesError;

  let pending = supabase
    .from("bot_pending_actions")
    .delete()
    .lt("expires_at", new Date().toISOString());
  if (uid) pending = pending.eq("user_id", uid);
  const { error: pendingError } = await pending;
  if (pendingError) throw pendingError;
}
