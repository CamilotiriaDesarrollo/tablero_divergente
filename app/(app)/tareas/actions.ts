"use server";
// Server Action de lectura co-localizada en la ruta de tareas: expone la lectura
// server getSubtasks (lib/db/tasks) a los Client Components para cargar subtareas
// bajo demanda. No es una mutacion; la escritura sigue pasando por lib/db/actions.
// RLS garantiza que solo se ven las subtareas del dueno.
import * as tasksDb from "@/lib/db/tasks";
import type { Task } from "@/types/db";

export async function getSubtasksAction(parentId: string): Promise<Task[]> {
  return tasksDb.getSubtasks(parentId);
}
