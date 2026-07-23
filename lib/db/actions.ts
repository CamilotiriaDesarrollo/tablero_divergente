"use server";
// lib/db/actions.ts
// Server Actions: la unica puerta de mutacion para los Client Components.
// Validan entrada con zod, delegan en lib/db, y revalidan las rutas afectadas.
// La autorizacion la garantiza RLS (user_id = auth.uid()) en cada operacion.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as projectsDb from "@/lib/db/projects";
import * as tasksDb from "@/lib/db/tasks";
import * as phasesDb from "@/lib/db/phases";
import * as marketingDb from "@/lib/db/marketing";
import type {
  MarketingAvatar,
  MarketingContentIdea,
  Phase,
  Project,
  Task,
} from "@/types/db";

function revalidateApp() {
  // App de un solo dueno: revalidar el arbol de la app mantiene todo consistente.
  revalidatePath("/", "layout");
}

// ---------- Esquemas ----------

const projectStatus = z.enum(["idea", "activo", "pausado", "hecho", "archivado"]);
const taskStatus = z.enum(["inbox", "todo", "en_progreso", "hecho"]);
const priority = z.enum(["alta", "media", "baja"]);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida (YYYY-MM-DD)");

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacio").max(200),
  description: z.string().trim().max(8000).nullish(),
  status: projectStatus.optional(),
  type: z.array(z.string()).nullish(),
  color: z.string().nullish(),
  icon: z.string().nullish(),
  cover_url: z.string().trim().max(2000).nullish(),
});

const updateProjectSchema = createProjectSchema.partial();

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "El titulo no puede estar vacio").max(500),
  notes: z.string().trim().max(5000).nullish(),
  project_id: z.string().uuid().nullish(),
  phase_id: z.string().uuid().nullish(),
  parent_task_id: z.string().uuid().nullish(),
  priority: priority.nullish(),
  status: taskStatus.optional(),
  task_type: z.array(z.string()).nullish(),
  category: z.string().nullish(),
  received_at: isoDate.nullish(),
  due_at: isoDate.nullish(),
  resource_url: z.string().trim().max(2000).nullish(),
  is_daily: z.boolean().optional(),
});

const updateTaskSchema = createTaskSchema.partial();

// ---------- Proyectos ----------

export async function createProjectAction(
  input: z.input<typeof createProjectSchema>,
): Promise<Project> {
  const data = createProjectSchema.parse(input);
  const project = await projectsDb.createProject(data);
  revalidateApp();
  return project;
}

export async function updateProjectAction(
  id: string,
  input: z.input<typeof updateProjectSchema>,
): Promise<Project> {
  const data = updateProjectSchema.parse(input);
  const project = await projectsDb.updateProject(id, data);
  revalidateApp();
  return project;
}

export async function setProjectStatusAction(
  id: string,
  status: z.infer<typeof projectStatus>,
): Promise<Project> {
  const project = await projectsDb.setProjectStatus(id, projectStatus.parse(status));
  revalidateApp();
  return project;
}

export async function promoteIdeaAction(id: string): Promise<Project> {
  const project = await projectsDb.promoteIdea(z.string().uuid().parse(id));
  revalidateApp();
  return project;
}

export async function deleteProjectAction(id: string): Promise<void> {
  await projectsDb.deleteProject(z.string().uuid().parse(id));
  revalidateApp();
}

export async function reorderProjectsAction(ids: string[]): Promise<void> {
  await projectsDb.reorderProjects(z.array(z.string().uuid()).parse(ids));
  revalidateApp();
}

// ---------- Fases / modulos ----------

const createPhaseSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1, "El nombre no puede estar vacio").max(120),
});

export async function createPhaseAction(
  input: z.input<typeof createPhaseSchema>,
): Promise<Phase> {
  const data = createPhaseSchema.parse(input);
  const phase = await phasesDb.createPhase(data);
  revalidateApp();
  return phase;
}

export async function renamePhaseAction(id: string, name: string): Promise<Phase> {
  const parsed = z
    .object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) })
    .parse({ id, name });
  const phase = await phasesDb.updatePhase(parsed.id, { name: parsed.name });
  revalidateApp();
  return phase;
}

export async function deletePhaseAction(id: string): Promise<void> {
  await phasesDb.deletePhase(z.string().uuid().parse(id));
  revalidateApp();
}

export async function reorderPhasesAction(ids: string[]): Promise<void> {
  await phasesDb.reorderPhases(z.array(z.string().uuid()).parse(ids));
  revalidateApp();
}

// ---------- Tareas ----------

export async function createTaskAction(
  input: z.input<typeof createTaskSchema>,
): Promise<Task> {
  const data = createTaskSchema.parse(input);
  const task = await tasksDb.createTask(data);
  revalidateApp();
  return task;
}

export async function quickCaptureAction(
  title: string,
  notes?: string,
): Promise<Task> {
  const parsed = z
    .object({ title: z.string().trim().min(1).max(500), notes: z.string().max(5000).optional() })
    .parse({ title, notes });
  const task = await tasksDb.quickCapture(parsed.title, parsed.notes);
  revalidateApp();
  return task;
}

export async function createSubtaskAction(
  parentId: string,
  title: string,
): Promise<Task> {
  const parsed = z
    .object({ parentId: z.string().uuid(), title: z.string().trim().min(1).max(500) })
    .parse({ parentId, title });
  const task = await tasksDb.createSubtask(parsed.parentId, parsed.title);
  revalidateApp();
  return task;
}

export async function updateTaskAction(
  id: string,
  input: z.input<typeof updateTaskSchema>,
): Promise<Task> {
  const data = updateTaskSchema.parse(input);
  const task = await tasksDb.updateTask(z.string().uuid().parse(id), data);
  revalidateApp();
  return task;
}

export async function setTaskStatusAction(
  id: string,
  status: z.infer<typeof taskStatus>,
  position?: number,
): Promise<Task> {
  const task = await tasksDb.setTaskStatus(
    z.string().uuid().parse(id),
    taskStatus.parse(status),
    position,
  );
  revalidateApp();
  return task;
}

export async function completeTaskAction(id: string): Promise<Task> {
  const task = await tasksDb.completeTask(z.string().uuid().parse(id));
  revalidateApp();
  return task;
}

export async function reopenTaskAction(id: string): Promise<Task> {
  const task = await tasksDb.reopenTask(z.string().uuid().parse(id));
  revalidateApp();
  return task;
}

export async function toggleDailyAction(id: string, value: boolean): Promise<Task> {
  const task = await tasksDb.toggleDaily(z.string().uuid().parse(id), z.boolean().parse(value));
  revalidateApp();
  return task;
}

export async function moveTaskAction(
  id: string,
  status: z.infer<typeof taskStatus>,
  position: number,
): Promise<Task> {
  const task = await tasksDb.moveTask(
    z.string().uuid().parse(id),
    taskStatus.parse(status),
    z.number().int().min(0).parse(position),
  );
  revalidateApp();
  return task;
}

export async function deleteTaskAction(id: string): Promise<void> {
  await tasksDb.deleteTask(z.string().uuid().parse(id));
  revalidateApp();
}

const moveOnBoardSchema = z.object({
  id: z.string().uuid(),
  status: taskStatus,
  destIds: z.array(z.string().uuid()),
  sourceIds: z.array(z.string().uuid()).optional(),
});

/** Kanban: mover + reordenar destino (+ origen) en UNA accion (una revalidacion). */
export async function moveTaskOnBoardAction(
  params: z.input<typeof moveOnBoardSchema>,
): Promise<void> {
  const parsed = moveOnBoardSchema.parse(params);
  await tasksDb.moveTaskOnBoard(parsed);
  revalidateApp();
}

export async function reorderTasksAction(ids: string[]): Promise<void> {
  await tasksDb.reorderTasks(z.array(z.string().uuid()).parse(ids));
  revalidateApp();
}

// ---------- Marketing: avatares e ideas de contenido ----------

const marketingContentStatus = z.enum(["idea", "en_proceso", "publicado"]);

const updateAvatarSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacio").max(120).optional(),
  headline: z.string().trim().max(200).nullish(),
  description: z.string().trim().max(8000).nullish(),
  color: z.string().nullish(),
  icon: z.string().nullish(),
});

export async function updateAvatarAction(
  id: string,
  input: z.input<typeof updateAvatarSchema>,
): Promise<MarketingAvatar> {
  const data = updateAvatarSchema.parse(input);
  const avatar = await marketingDb.updateAvatar(z.string().uuid().parse(id), data);
  revalidateApp();
  return avatar;
}

const createContentIdeaSchema = z.object({
  avatar_id: z.string().uuid(),
  title: z.string().trim().min(1, "El titulo no puede estar vacio").max(300),
  notes: z.string().trim().max(8000).nullish(),
  format: z.string().trim().max(80).nullish(),
  status: marketingContentStatus.optional(),
});

export async function createContentIdeaAction(
  input: z.input<typeof createContentIdeaSchema>,
): Promise<MarketingContentIdea> {
  const data = createContentIdeaSchema.parse(input);
  const idea = await marketingDb.createContentIdea(data);
  revalidateApp();
  return idea;
}

const updateContentIdeaSchema = z.object({
  title: z.string().trim().min(1, "El titulo no puede estar vacio").max(300).optional(),
  notes: z.string().trim().max(8000).nullish(),
  format: z.string().trim().max(80).nullish(),
  status: marketingContentStatus.optional(),
});

export async function updateContentIdeaAction(
  id: string,
  input: z.input<typeof updateContentIdeaSchema>,
): Promise<MarketingContentIdea> {
  const data = updateContentIdeaSchema.parse(input);
  const idea = await marketingDb.updateContentIdea(z.string().uuid().parse(id), data);
  revalidateApp();
  return idea;
}

export async function setContentIdeaStatusAction(
  id: string,
  status: z.infer<typeof marketingContentStatus>,
): Promise<MarketingContentIdea> {
  const idea = await marketingDb.setContentIdeaStatus(
    z.string().uuid().parse(id),
    marketingContentStatus.parse(status),
  );
  revalidateApp();
  return idea;
}

export async function deleteContentIdeaAction(id: string): Promise<void> {
  await marketingDb.deleteContentIdea(z.string().uuid().parse(id));
  revalidateApp();
}

export async function reorderContentIdeasAction(ids: string[]): Promise<void> {
  await marketingDb.reorderContentIdeas(z.array(z.string().uuid()).parse(ids));
  revalidateApp();
}
