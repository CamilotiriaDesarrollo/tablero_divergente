// lib/db/tasks.ts
// Acceso a datos de tareas (CLAUDE.md: data access centralizado). Server-side.
// Funciona en dos contextos (lib/db/context.ts): web (cookies + RLS, historico)
// y bot (service_role + user_id fijo). Como service_role bypassa RLS, cuando el
// contexto define ownerId() se anade .eq("user_id", ...) como defensa en
// profundidad en TODAS las consultas y mutaciones.
// Las vistas de la plantilla (Hoy, buckets, bandeja, diarias) son FILTROS,
// no tablas (BLUEPRINT seccion 4).
import { dbContext, ownerId } from "@/lib/db/context";
import { isSupabaseConfigured } from "@/lib/config";
import type {
  Task,
  TaskInsert,
  TaskStatus,
  TaskUpdate,
  TaskWithProject,
} from "@/types/db";
import { toDateColumn } from "@/lib/utils/dates";

const PROJECT_JOIN = "*, project:projects(id, name, color, icon)";

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

/**
 * True si el error es "falta la columna phase_id" (migracion 0005 sin aplicar).
 * PostgREST devuelve PGRST204; Postgres crudo 42703. Nos permite reintentar la
 * escritura sin phase_id para que la app funcione aunque falte la migracion.
 */
function isMissingPhaseColumn(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  return (code === "PGRST204" || code === "42703") && /phase_id/.test(error.message ?? "");
}

// ---------- Consultas ----------

export interface TaskFilter {
  status?: TaskStatus[];
  projectId?: string | null;
  isDaily?: boolean;
  topLevelOnly?: boolean; // parent_task_id is null
  withProject?: boolean;
}

export async function getTasks(filter: TaskFilter = {}): Promise<TaskWithProject[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("tasks")
    .select(filter.withProject ? PROJECT_JOIN : "*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  if (filter.status?.length) query = query.in("status", filter.status);
  if (filter.projectId !== undefined) {
    query =
      filter.projectId === null
        ? query.is("project_id", null)
        : query.eq("project_id", filter.projectId);
  }
  if (filter.isDaily !== undefined) query = query.eq("is_daily", filter.isDaily);
  if (filter.topLevelOnly) query = query.is("parent_task_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithProject[];
}

/** Tareas abiertas de nivel superior (para el tablero de buckets y Kanban). */
export async function getOpenTasks(): Promise<TaskWithProject[]> {
  return getTasks({
    status: ["todo", "en_progreso"],
    topLevelOnly: true,
    withProject: true,
  });
}

/** Todas las tareas de nivel superior (incluye hechas) con su proyecto. */
export async function getAllBoardTasks(): Promise<TaskWithProject[]> {
  return getTasks({
    status: ["todo", "en_progreso", "hecho"],
    topLevelOnly: true,
    withProject: true,
  });
}

/** Bandeja = status 'inbox'. */
export async function getInboxTasks(): Promise<TaskWithProject[]> {
  return getTasks({ status: ["inbox"], withProject: true });
}

/** Tareas diarias = is_daily true. */
export async function getDailyTasks(): Promise<TaskWithProject[]> {
  return getTasks({ isDaily: true, withProject: true });
}

/** Tareas de un proyecto (nivel superior). */
export async function getTasksByProject(projectId: string): Promise<TaskWithProject[]> {
  return getTasks({ projectId, topLevelOnly: true, withProject: true });
}

/** Subtareas de una tarea (micro-tareas). */
export async function getSubtasks(parentId: string): Promise<Task[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("parent_task_id", parentId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Hoy = due_at = hoy y status <> hecho. */
export async function getTodayTasks(): Promise<TaskWithProject[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  const today = toDateColumn(new Date());
  let query = supabase
    .from("tasks")
    .select(PROJECT_JOIN)
    .eq("due_at", today)
    .neq("status", "hecho")
    .order("position", { ascending: true });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithProject[];
}

/** Vencidas = due_at < hoy y status <> hecho. */
export async function getOverdueTasks(): Promise<TaskWithProject[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  const today = toDateColumn(new Date());
  let query = supabase
    .from("tasks")
    .select(PROJECT_JOIN)
    .lt("due_at", today)
    .neq("status", "hecho")
    .order("due_at", { ascending: true });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithProject[];
}

/** Tareas con fecha dentro de un rango, para el calendario (por due_at). */
export async function getTasksInRange(
  from: Date,
  to: Date,
): Promise<TaskWithProject[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("tasks")
    .select(PROJECT_JOIN)
    .gte("due_at", toDateColumn(from))
    .lte("due_at", toDateColumn(to))
    .order("due_at", { ascending: true });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithProject[];
}

/** Tareas realizadas con completed_at a partir de una fecha (ISO). Para el dashboard. */
export async function getCompletedSince(sinceISO: string): Promise<TaskWithProject[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase
    .from("tasks")
    .select(PROJECT_JOIN)
    .eq("status", "hecho")
    .gte("completed_at", sinceISO)
    .order("completed_at", { ascending: false });
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithProject[];
}

export async function getTaskById(id: string): Promise<Task | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await client();
  let query = supabase.from("tasks").select("*").eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

/** Consulta abierta para el asistente (por proyecto, prioridad, con/sin fecha). */
export async function searchTasks(params: {
  projectId?: string | null;
  priority?: ("alta" | "media" | "baja")[];
  status?: TaskStatus[];
  hasDueDate?: boolean;
  dueOn?: string; // YYYY-MM-DD
  limit?: number;
}): Promise<TaskWithProject[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await client();
  let query = supabase.from("tasks").select(PROJECT_JOIN);

  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  if (params.projectId !== undefined) {
    query =
      params.projectId === null
        ? query.is("project_id", null)
        : query.eq("project_id", params.projectId);
  }
  if (params.priority?.length) query = query.in("priority", params.priority);
  if (params.status?.length) query = query.in("status", params.status);
  if (params.hasDueDate === true) query = query.not("due_at", "is", null);
  if (params.hasDueDate === false) query = query.is("due_at", null);
  if (params.dueOn) query = query.eq("due_at", params.dueOn);

  query = query
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(params.limit ?? 50);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithProject[];
}

// ---------- Mutaciones ----------

export async function createTask(
  input: Omit<TaskInsert, "user_id">,
): Promise<Task> {
  const supabase = await client();
  const userId = await requireUserId();
  // Defaults de dominio: cualquier origen de creacion conserva fecha recibida
  // de hoy y prioridad media, salvo que envie un valor explicito.
  const payload: TaskInsert = {
    ...input,
    user_id: userId,
    priority: input.priority === undefined ? "media" : input.priority,
    received_at:
      input.received_at === undefined ? toDateColumn(new Date()) : input.received_at,
  };
  const first = await supabase.from("tasks").insert(payload).select("*").single();
  // Reintento sin phase_id si la columna aun no existe (migracion 0005 pendiente).
  if (first.error && isMissingPhaseColumn(first.error) && "phase_id" in payload) {
    const rest = { ...payload };
    delete rest.phase_id;
    const retry = await supabase.from("tasks").insert(rest).select("*").single();
    if (retry.error) throw retry.error;
    return retry.data;
  }
  if (first.error) throw first.error;
  return first.data;
}

/** Captura rapida a la bandeja (status inbox, sin proyecto ni fecha). */
export async function quickCapture(title: string, notes?: string): Promise<Task> {
  return createTask({ title, notes: notes ?? null, status: "inbox" });
}

export async function createSubtask(
  parentTaskId: string,
  title: string,
): Promise<Task> {
  const parent = await getTaskById(parentTaskId);
  return createTask({
    title,
    parent_task_id: parentTaskId,
    project_id: parent?.project_id ?? null,
    status: "todo",
  });
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  const supabase = await client();
  const uid = ownerId();
  const run = (p: TaskUpdate) => {
    let q = supabase.from("tasks").update(p).eq("id", id);
    if (uid) q = q.eq("user_id", uid);
    return q.select("*").single();
  };
  const first = await run(patch);
  // Reintento sin phase_id si la columna aun no existe (migracion 0005 pendiente).
  if (first.error && isMissingPhaseColumn(first.error) && "phase_id" in patch) {
    const rest = { ...patch };
    delete rest.phase_id;
    const retry = await run(rest);
    if (retry.error) throw retry.error;
    return retry.data;
  }
  if (first.error) throw first.error;
  return first.data;
}

/** Cambia el estado. Si pasa a 'hecho' marca completed_at; si sale de hecho lo limpia. */
export async function setTaskStatus(
  id: string,
  status: TaskStatus,
  position?: number,
): Promise<Task> {
  const patch: TaskUpdate = { status };
  patch.completed_at = status === "hecho" ? new Date().toISOString() : null;
  if (position !== undefined) patch.position = position;
  return updateTask(id, patch);
}

/** Realizada = status 'hecho' + completed_at (BLUEPRINT seccion 4). */
export async function completeTask(id: string): Promise<Task> {
  return setTaskStatus(id, "hecho");
}

export async function reopenTask(id: string): Promise<Task> {
  return setTaskStatus(id, "todo");
}

export async function toggleDaily(id: string, value: boolean): Promise<Task> {
  return updateTask(id, { is_daily: value });
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await client();
  let query = supabase.from("tasks").delete().eq("id", id);
  const uid = ownerId();
  if (uid) query = query.eq("user_id", uid);
  const { error } = await query;
  if (error) throw error;
}

/** Mueve una tarea en el Kanban: nuevo estado y nueva posicion. */
export async function moveTask(
  id: string,
  status: TaskStatus,
  position: number,
): Promise<Task> {
  return setTaskStatus(id, status, position);
}

/**
 * Movimiento completo del Kanban en UNA operacion (antes eran 3 acciones y 3
 * revalidaciones). Fija estado + completed_at + posicion de la tarea movida,
 * normaliza el orden de la columna destino y, si cambio de columna, el del origen.
 */
export async function moveTaskOnBoard(params: {
  id: string;
  status: TaskStatus;
  destIds: string[];
  sourceIds?: string[];
}): Promise<void> {
  const index = Math.max(0, params.destIds.indexOf(params.id));
  await setTaskStatus(params.id, params.status, index);
  await reorderTasks(params.destIds);
  if (params.sourceIds?.length) await reorderTasks(params.sourceIds);
}

/** Reordena un conjunto de tareas (orden manual del dueno). */
export async function reorderTasks(ids: string[]): Promise<void> {
  const supabase = await client();
  const uid = ownerId();
  await Promise.all(
    ids.map((id, index) => {
      let query = supabase.from("tasks").update({ position: index }).eq("id", id);
      if (uid) query = query.eq("user_id", uid);
      return query;
    }),
  );
}
