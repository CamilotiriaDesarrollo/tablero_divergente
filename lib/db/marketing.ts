// lib/db/marketing.ts
// Acceso a datos de la seccion Marketing (CLAUDE.md: data access centralizado;
// los componentes NO consultan Supabase directo). Todo server-side.
// Dos entidades: avatares (buyer personas fijas, perfil editable) e ideas de
// contenido asociadas a un avatar. Mismo patron que projects.ts/phases.ts:
// filtra por ownerId() en modo dueno. Las lecturas son tolerantes: si la tabla
// aun no existe (migracion 0006 sin aplicar) devuelven [] en vez de romper la
// pagina.
import { randomUUID } from "node:crypto";
import { dbContext, ownerId } from "@/lib/db/context";
import { isSupabaseConfigured } from "@/lib/config";
import type {
  MarketingAvatar,
  MarketingAvatarObservation,
  MarketingAvatarObservationInsert,
  MarketingAvatarObservationUpdate,
  MarketingAvatarUpdate,
  MarketingAvatarWithIdeas,
  MarketingContentIdea,
  MarketingContentIdeaInsert,
  MarketingContentIdeaUpdate,
  MarketingContentStatus,
} from "@/types/db";

// Codigos de "tabla inexistente": Postgres crudo (42P01) y PostgREST (PGRST205).
// Cuando la migracion 0006 no se ha aplicado, degradamos a vacio en vez de romper.
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

async function client() {
  return await dbContext().getClient();
}

async function requireUserId(): Promise<string> {
  const ctx = dbContext();
  if (ctx.userId) return ctx.userId;
  const supabase = await ctx.getClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

const FALLBACK_PATTERN = /\n?\[\[TABLERO_CONTRASTS:([A-Za-z0-9_-]+)\]\]\s*$/;

function fallbackObservations(avatar: MarketingAvatar): MarketingAvatarObservation[] {
  const encoded = avatar.description?.match(FALLBACK_PATTERN)?.[1];
  if (!encoded) return [];
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as MarketingAvatarObservation[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item.avatar_id === avatar.id)
      : [];
  } catch {
    return [];
  }
}

function descriptionWithFallback(
  description: string | null,
  observations: MarketingAvatarObservation[],
) {
  const visibleDescription = (description ?? "").replace(FALLBACK_PATTERN, "").trimEnd();
  const encoded = Buffer.from(JSON.stringify(observations), "utf8").toString("base64url");
  return `${visibleDescription}${visibleDescription ? "\n" : ""}[[TABLERO_CONTRASTS:${encoded}]]`;
}

async function findFallbackObservation(id: string) {
  const avatars = await getAvatars();
  for (const avatar of avatars) {
    const observations = fallbackObservations(avatar);
    const index = observations.findIndex((item) => item.id === id);
    if (index >= 0) return { avatar, observations, index };
  }
  return null;
}

// ---------- Consultas ----------

/** Avatares del dueno, ordenados. Tolerante si la tabla no existe todavia. */
export async function getAvatars(): Promise<MarketingAvatar[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("marketing_avatars")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return data ?? [];
}

export async function getAvatarById(id: string): Promise<MarketingAvatar | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await client();
  let query = supabase.from("marketing_avatars").select("*").eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query.maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return data;
}

/** Ideas de contenido, opcionalmente filtradas por avatar. Ordenadas. */
export async function getContentIdeas(opts?: {
  avatarId?: string;
}): Promise<MarketingContentIdea[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("marketing_content_ideas")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  if (opts?.avatarId) query = query.eq("avatar_id", opts.avatarId);
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return data ?? [];
}

/** Registro de aprendizaje, evidencia e hipotesis de los avatares. */
export async function getAvatarObservations(opts?: {
  avatarId?: string;
}): Promise<MarketingAvatarObservation[]> {
  if (!isSupabaseConfigured()) return [];
  const avatars = await getAvatars();
  const fallback = avatars
    .filter((avatar) => !opts?.avatarId || avatar.id === opts.avatarId)
    .flatMap(fallbackObservations);
  const supabase = await client();
  let query = supabase
    .from("marketing_avatar_observations")
    .select("*")
    .order("created_at", { ascending: false });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  if (opts?.avatarId) query = query.eq("avatar_id", opts.avatarId);
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return fallback;
    throw error;
  }
  const storedIds = new Set((data ?? []).map((item) => item.id));
  return [...(data ?? []), ...fallback.filter((item) => !storedIds.has(item.id))];
}

/**
 * Avatares con sus ideas ya agrupadas, para la vista de Marketing. Hace dos
 * consultas (avatares + ideas) y agrupa en memoria; evita el N+1 de pedir las
 * ideas avatar por avatar.
 */
export async function getMarketingBoard(): Promise<MarketingAvatarWithIdeas[]> {
  const [avatars, ideas, observations] = await Promise.all([
    getAvatars(),
    getContentIdeas(),
    getAvatarObservations(),
  ]);
  const ideasByAvatar = new Map<string, MarketingContentIdea[]>();
  for (const idea of ideas) {
    ideasByAvatar.set(idea.avatar_id, [
      ...(ideasByAvatar.get(idea.avatar_id) ?? []),
      idea,
    ]);
  }
  const observationsByAvatar = new Map<string, MarketingAvatarObservation[]>();
  for (const observation of observations) {
    observationsByAvatar.set(observation.avatar_id, [
      ...(observationsByAvatar.get(observation.avatar_id) ?? []),
      observation,
    ]);
  }
  return avatars.map((avatar) => ({
    ...avatar,
    ideas: ideasByAvatar.get(avatar.id) ?? [],
    observations: observationsByAvatar.get(avatar.id) ?? [],
  }));
}

// ---------- Mutaciones ----------

/** Actualiza el perfil de un avatar (nombre, titular, descripcion, color, icono). */
export async function updateAvatar(
  id: string,
  patch: MarketingAvatarUpdate,
): Promise<MarketingAvatar> {
  const supabase = await client();
  let query = supabase.from("marketing_avatars").update(patch).eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

export async function createContentIdea(
  input: Omit<MarketingContentIdeaInsert, "user_id">,
): Promise<MarketingContentIdea> {
  const supabase = await client();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("marketing_content_ideas")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateContentIdea(
  id: string,
  patch: MarketingContentIdeaUpdate,
): Promise<MarketingContentIdea> {
  const supabase = await client();
  let query = supabase.from("marketing_content_ideas").update(patch).eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

export async function setContentIdeaStatus(
  id: string,
  status: MarketingContentStatus,
): Promise<MarketingContentIdea> {
  return updateContentIdea(id, { status });
}

export async function deleteContentIdea(id: string): Promise<void> {
  const supabase = await client();
  let query = supabase.from("marketing_content_ideas").delete().eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { error } = await query;
  if (error) throw error;
}

export async function createAvatarObservation(
  input: Omit<MarketingAvatarObservationInsert, "user_id">,
): Promise<MarketingAvatarObservation> {
  const supabase = await client();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("marketing_avatar_observations")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) {
    if (!isMissingTable(error)) throw error;
    const avatar = await getAvatarById(input.avatar_id);
    if (!avatar) throw new Error("No se encontro el perfil seleccionado");
    const now = new Date().toISOString();
    const observation: MarketingAvatarObservation = {
      id: randomUUID(),
      user_id: avatar.user_id,
      avatar_id: avatar.id,
      kind: input.kind ?? "nota",
      title: input.title,
      content: input.content ?? null,
      status: input.status ?? "en_observacion",
      created_at: now,
      updated_at: now,
    };
    const observations = [observation, ...fallbackObservations(avatar)];
    await updateAvatar(avatar.id, {
      description: descriptionWithFallback(avatar.description, observations),
    });
    return observation;
  }
  return data;
}

export async function updateAvatarObservation(
  id: string,
  patch: MarketingAvatarObservationUpdate,
): Promise<MarketingAvatarObservation> {
  const fallback = await findFallbackObservation(id);
  if (fallback) {
    const updated: MarketingAvatarObservation = {
      ...fallback.observations[fallback.index],
      ...patch,
      id,
      user_id: fallback.avatar.user_id,
      avatar_id: fallback.avatar.id,
      updated_at: new Date().toISOString(),
    };
    fallback.observations[fallback.index] = updated;
    await updateAvatar(fallback.avatar.id, {
      description: descriptionWithFallback(
        fallback.avatar.description,
        fallback.observations,
      ),
    });
    return updated;
  }
  const supabase = await client();
  let query = supabase
    .from("marketing_avatar_observations")
    .update(patch)
    .eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteAvatarObservation(id: string): Promise<void> {
  const fallback = await findFallbackObservation(id);
  if (fallback) {
    fallback.observations.splice(fallback.index, 1);
    await updateAvatar(fallback.avatar.id, {
      description: descriptionWithFallback(
        fallback.avatar.description,
        fallback.observations,
      ),
    });
    return;
  }
  const supabase = await client();
  let query = supabase.from("marketing_avatar_observations").delete().eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { error } = await query;
  if (error) throw error;
}

/** Reordena las ideas de un avatar segun el arreglo de ids (orden manual). */
export async function reorderContentIdeas(ids: string[]): Promise<void> {
  const supabase = await client();
  const uid = ownerId();
  await Promise.all(
    ids.map((id, index) => {
      let query = supabase
        .from("marketing_content_ideas")
        .update({ position: index })
        .eq("id", id);
      if (uid) query = query.eq("user_id", uid);
      return query;
    }),
  );
}
