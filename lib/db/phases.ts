// lib/db/phases.ts
// Acceso a datos de fases/modulos de un proyecto (CLAUDE.md: data access
// centralizado). Una fase agrupa tareas dentro de un proyecto para organizarlas
// (ej. "Fase 0", "Modulo 1", "Investigacion"). Todo server-side.
// Mismo patron que projects.ts/tasks.ts: filtra por ownerId() en modo dueno.
// getPhasesByProject es tolerante: si la tabla aun no existe (migracion 0005 sin
// aplicar) devuelve [] en vez de romper la pagina.
import { dbContext, ownerId } from "@/lib/db/context";
import { isSupabaseConfigured } from "@/lib/config";
import type { Phase, PhaseInsert, PhaseUpdate } from "@/types/db";

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

/** Fases de un proyecto, ordenadas. Tolerante si la tabla no existe todavia. */
export async function getPhasesByProject(projectId: string): Promise<Phase[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("phases")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query;
  if (error) {
    // La tabla aun no existe (migracion 0005 sin aplicar): degradamos a [] en vez
    // de romper la pagina. Postgres crudo devuelve 42P01; PostgREST (Supabase)
    // devuelve PGRST205 ("table not found in schema cache").
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw error;
  }
  return data ?? [];
}

export async function createPhase(
  input: Omit<PhaseInsert, "user_id">,
): Promise<Phase> {
  const supabase = await client();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("phases")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePhase(id: string, patch: PhaseUpdate): Promise<Phase> {
  const supabase = await client();
  let query = supabase.from("phases").update(patch).eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

/** Elimina una fase. Sus tareas quedan sin fase (FK on delete set null). */
export async function deletePhase(id: string): Promise<void> {
  const supabase = await client();
  let query = supabase.from("phases").delete().eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { error } = await query;
  if (error) throw error;
}

/** Reordena las fases de un proyecto segun el arreglo de ids (orden manual). */
export async function reorderPhases(ids: string[]): Promise<void> {
  const supabase = await client();
  const uid = ownerId();
  await Promise.all(
    ids.map((id, index) => {
      let query = supabase.from("phases").update({ position: index }).eq("id", id);
      if (uid) query = query.eq("user_id", uid);
      return query;
    }),
  );
}
