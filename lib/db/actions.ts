"use server";
// lib/db/actions.ts
// Server Actions: la unica puerta de mutacion para los Client Components.
// Validan entrada con zod, delegan en lib/db, y revalidan las rutas afectadas.
// La autorizacion la garantiza RLS (user_id = auth.uid()) en cada operacion.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as projectsDb from "@/lib/db/projects";
import * as tasksDb from "@/lib/db/tasks";
import type { Project, Task } from "@/types/db";

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
  description: z.string().trim().max(2000).nullish(),
  status: projectStatus.optional(),
  type: z.array(z.string()).nullish(),
  color: z.string().nullish(),
  icon: z.string().nullish(),
  cover_url: z.string().url().nullish().or(z.literal("")),
});

const updateProjectSchema = createProjectSchema.partial();

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "El titulo no puede estar vacio").max(500),
  notes: z.string().trim().max(5000).nullish(),
  project_id: z.string().uuid().nullish(),
  parent_task_id: z.string().uuid().nullish(),
  priority: priority.nullish(),
  status: taskStatus.optional(),
  task_type: z.array(z.string()).nullish(),
  category: z.string().nullish(),
  received_at: isoDate.nullish(),
  due_at: isoDate.nullish(),
  resource_url: z.string().url().nullish().or(z.literal("")),
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

export async function reorderTasksAction(ids: string[]): Promise<void> {
  await tasksDb.reorderTasks(z.array(z.string().uuid()).parse(ids));
  revalidateApp();
}
