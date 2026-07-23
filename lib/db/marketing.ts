// lib/db/marketing.ts
// Acceso a datos de la seccion Marketing (CLAUDE.md: data access centralizado;
// los componentes NO consultan Supabase directo). Todo server-side.
// Dos entidades: avatares (buyer personas fijas, perfil editable) e ideas de
// contenido asociadas a un avatar. Mismo patron que projects.ts/phases.ts:
// filtra por ownerId() en modo dueno. Las lecturas son tolerantes: si la tabla
// aun no existe (migracion 0006 sin aplicar) devuelven [] en vez de romper la
// pagina.
import { dbContext, ownerId } from "@/lib/db/context";
import { isSupabaseConfigured } from "@/lib/config";
import type {
  MarketingAvatar,
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

/**
 * Avatares con sus ideas ya agrupadas, para la vista de Marketing. Hace dos
 * consultas (avatares + ideas) y agrupa en memoria; evita el N+1 de pedir las
 * ideas avatar por avatar.
 */
export async function getMarketingBoard(): Promise<MarketingAvatarWithIdeas[]> {
  const [avatars, ideas] = await Promise.all([getAvatars(), getContentIdeas()]);
  const ideasByAvatar = new Map<string, MarketingContentIdea[]>();
  for (const idea of ideas) {
    ideasByAvatar.set(idea.avatar_id, [
      ...(ideasByAvatar.get(idea.avatar_id) ?? []),
      idea,
    ]);
  }
  return avatars.map((avatar) => ({
    ...avatar,
    ideas: ideasByAvatar.get(avatar.id) ?? [],
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
