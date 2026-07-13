// lib/db/projects.ts
// Acceso a datos de proyectos (CLAUDE.md: data access centralizado; los
// componentes NO consultan Supabase directo). Todo server-side; RLS garantiza
// que solo se ve/edita lo del dueno (user_id = auth.uid()).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import type {
  Project,
  ProjectInsert,
  ProjectStatus,
  ProjectUpdate,
  ProjectWithCount,
} from "@/types/db";

async function client() {
  return await createClient();
}

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

// ---------- Consultas ----------

export async function getProjects(opts?: {
  statuses?: ProjectStatus[];
}): Promise<Project[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("projects")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (opts?.statuses?.length) {
    query = query.in("status", opts.statuses);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Proyectos "reales" (no ideas, no archivados) para la galeria/tablero. */
export async function getActiveBoardProjects(): Promise<Project[]> {
  return getProjects({ statuses: ["activo", "pausado", "hecho"] });
}

/** Banco de ideas = proyectos con status 'idea'. */
export async function getIdeas(): Promise<Project[]> {
  return getProjects({ statuses: ["idea"] });
}

/** Proyectos con conteo de tareas (evita N+1 con el count embebido de Supabase). */
export async function getProjectsWithCounts(opts?: {
  statuses?: ProjectStatus[];
}): Promise<ProjectWithCount[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("projects")
    .select("*, tasks(count)")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (opts?.statuses?.length) {
    query = query.in("status", opts.statuses);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { tasks, ...project } = row as Project & {
      tasks?: { count: number }[] | null;
    };
    return {
      ...project,
      task_count: tasks?.[0]?.count ?? 0,
    } as ProjectWithCount;
  });
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await client();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Nombres/ids de proyectos para selects y para el asistente. */
export async function getProjectOptions(): Promise<
  Pick<Project, "id" | "name" | "color" | "icon" | "status">[]
> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, color, icon, status")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---------- Mutaciones (usadas por Server Actions y por el asistente) ----------

export async function createProject(
  input: Omit<ProjectInsert, "user_id">,
): Promise<Project> {
  const supabase = await client();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  patch: ProjectUpdate,
): Promise<Project> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<Project> {
  return updateProject(id, { status });
}

/** Promover una idea a proyecto activo. Cero migracion de datos. */
export async function promoteIdea(id: string): Promise<Project> {
  return updateProject(id, { status: "activo" });
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

/** Reordena proyectos segun el arreglo de ids (orden manual del dueno). */
export async function reorderProjects(ids: string[]): Promise<void> {
  const supabase = await client();
  await Promise.all(
    ids.map((id, index) =>
      supabase.from("projects").update({ position: index }).eq("id", id),
    ),
  );
}
