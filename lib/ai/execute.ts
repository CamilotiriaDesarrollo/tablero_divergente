// lib/ai/execute.ts
// Ejecuta una llamada a herramienta del asistente contra lib/db. Valida la
// entrada con zod antes de tocar la base. Devuelve el texto para el tool_result
// y, si hubo mutacion, una accion que el cliente usa para avisar y refrescar.
import * as tasksDb from "@/lib/db/tasks";
import * as projectsDb from "@/lib/db/projects";
import type { Project, TaskWithProject } from "@/types/db";
import { toolInputSchemas, type ToolName } from "@/lib/ai/tools";
import { diasRestantesLabel } from "@/lib/utils/dates";

export interface AssistantAction {
  type:
    | "tarea_creada"
    | "tarea_actualizada"
    | "tarea_completada"
    | "proyecto_creado";
  summary: string;
  entityId: string;
}

export interface ToolExecResult {
  content: string;
  action?: AssistantAction;
  isError?: boolean;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function matchProject(
  name: string,
  projects: Pick<Project, "id" | "name">[],
): Pick<Project, "id" | "name"> | null {
  const n = normalize(name);
  return (
    projects.find((p) => normalize(p.name) === n) ??
    projects.find((p) => normalize(p.name).includes(n) || n.includes(normalize(p.name))) ??
    null
  );
}

function summarizeTask(t: TaskWithProject): Record<string, unknown> {
  return {
    id: t.id,
    titulo: t.title,
    prioridad: t.priority,
    estado: t.status,
    fecha_entrega: t.due_at,
    dias: diasRestantesLabel(t.due_at),
    proyecto: t.project?.name ?? null,
    diaria: t.is_daily,
  };
}

export async function executeTool(
  name: string,
  rawInput: unknown,
): Promise<ToolExecResult> {
  try {
    switch (name as ToolName) {
      case "crear_tarea": {
        const input = toolInputSchemas.crear_tarea.parse(rawInput);
        let projectId = input.project_id ?? null;
        let projectNote = "";
        if (!projectId && input.project_name) {
          const options = await projectsDb.getProjectOptions();
          const match = matchProject(input.project_name, options);
          if (match) {
            projectId = match.id;
          } else {
            projectNote = ` (no encontre el proyecto "${input.project_name}", la cree sin proyecto)`;
          }
        }
        const task = await tasksDb.createTask({
          title: input.title,
          notes: input.notes ?? null,
          project_id: projectId,
          priority: input.priority ?? null,
          status: input.status ?? "todo",
          due_at: input.due_at ?? null,
          received_at: input.received_at ?? null,
          category: input.category ?? null,
          is_daily: input.is_daily ?? false,
        });
        return {
          content: `Tarea creada${projectNote}. id: ${task.id}, titulo: ${task.title}.`,
          action: {
            type: "tarea_creada",
            summary: task.title,
            entityId: task.id,
          },
        };
      }

      case "consultar_tareas": {
        const input = toolInputSchemas.consultar_tareas.parse(rawInput);
        let projectId = input.project_id;
        if (!projectId && input.project_name) {
          const options = await projectsDb.getProjectOptions();
          projectId = matchProject(input.project_name, options)?.id;
        }

        let tasks: TaskWithProject[] = [];
        switch (input.scope) {
          case "hoy":
            tasks = await tasksDb.getTodayTasks();
            break;
          case "vencidas":
            tasks = await tasksDb.getOverdueTasks();
            break;
          case "bandeja":
            tasks = await tasksDb.getInboxTasks();
            break;
          case "diarias":
            tasks = await tasksDb.getDailyTasks();
            break;
          default:
            tasks = await tasksDb.searchTasks({
              projectId: projectId ?? undefined,
              priority: input.priority,
              status: input.status,
              hasDueDate: input.sin_fecha === true ? false : undefined,
              dueOn: input.due_on,
              limit: 50,
            });
        }

        // Filtros adicionales sobre los scopes fijos.
        if (projectId) tasks = tasks.filter((t) => t.project_id === projectId);
        if (input.priority?.length)
          tasks = tasks.filter(
            (t) => t.priority && input.priority!.includes(t.priority),
          );

        return {
          content: JSON.stringify({
            total: tasks.length,
            tareas: tasks.slice(0, 50).map(summarizeTask),
          }),
        };
      }

      case "actualizar_tarea": {
        const input = toolInputSchemas.actualizar_tarea.parse(rawInput);
        const { task_id, ...rest } = input;
        // Si status pasa a hecho/sale de hecho, delega en setTaskStatus para completed_at.
        if (rest.status) {
          await tasksDb.setTaskStatus(task_id, rest.status);
        }
        const patch: Record<string, unknown> = {};
        if (rest.title !== undefined) patch.title = rest.title;
        if (rest.notes !== undefined) patch.notes = rest.notes;
        if (rest.priority !== undefined) patch.priority = rest.priority;
        if (rest.due_at !== undefined) patch.due_at = rest.due_at;
        if (rest.project_id !== undefined) patch.project_id = rest.project_id;
        if (rest.is_daily !== undefined) patch.is_daily = rest.is_daily;
        const task =
          Object.keys(patch).length > 0
            ? await tasksDb.updateTask(task_id, patch)
            : await tasksDb.getTaskById(task_id);
        return {
          content: `Tarea actualizada. id: ${task_id}.`,
          action: {
            type: "tarea_actualizada",
            summary: task?.title ?? "tarea",
            entityId: task_id,
          },
        };
      }

      case "completar_tarea": {
        const input = toolInputSchemas.completar_tarea.parse(rawInput);
        const task = await tasksDb.completeTask(input.task_id);
        return {
          content: `Tarea marcada como realizada. titulo: ${task.title}.`,
          action: {
            type: "tarea_completada",
            summary: task.title,
            entityId: task.id,
          },
        };
      }

      case "crear_proyecto": {
        const input = toolInputSchemas.crear_proyecto.parse(rawInput);
        const project = await projectsDb.createProject({
          name: input.name,
          description: input.description ?? null,
          status: input.status ?? "activo",
          color: input.color ?? null,
          icon: input.icon ?? null,
        });
        return {
          content: `Proyecto creado. id: ${project.id}, nombre: ${project.name}.`,
          action: {
            type: "proyecto_creado",
            summary: project.name,
            entityId: project.id,
          },
        };
      }

      case "consultar_proyectos": {
        const input = toolInputSchemas.consultar_proyectos.parse(rawInput);
        const projects = input.only_ideas
          ? await projectsDb.getIdeas()
          : await projectsDb.getProjects();
        return {
          content: JSON.stringify({
            total: projects.length,
            proyectos: projects.map((p) => ({
              id: p.id,
              nombre: p.name,
              estado: p.status,
            })),
          }),
        };
      }

      default:
        return { content: `Herramienta desconocida: ${name}`, isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return {
      content: `No se pudo ejecutar ${name}: ${message}`,
      isError: true,
    };
  }
}
