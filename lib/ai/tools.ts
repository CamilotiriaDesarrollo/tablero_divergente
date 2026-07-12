// lib/ai/tools.ts
// Definiciones de herramientas (tool-use) del asistente y sus validadores zod.
// Cada herramienta mapea a una funcion de lib/db. La ejecucion respeta RLS
// porque corre con la sesion del usuario (lib/supabase/server).
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const priority = z.enum(["alta", "media", "baja"]);
const taskStatus = z.enum(["inbox", "todo", "en_progreso", "hecho"]);
const projectStatus = z.enum(["idea", "activo", "pausado", "hecho", "archivado"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// --- Esquemas de validacion (server-side, defensa ante entradas del modelo) ---

export const toolInputSchemas = {
  crear_tarea: z.object({
    title: z.string().trim().min(1).max(500),
    notes: z.string().trim().max(5000).optional(),
    project_id: z.string().uuid().optional(),
    project_name: z.string().trim().max(200).optional(),
    priority: priority.optional(),
    status: taskStatus.optional(),
    due_at: isoDate.optional(),
    received_at: isoDate.optional(),
    category: z.string().trim().max(100).optional(),
    is_daily: z.boolean().optional(),
  }),
  consultar_tareas: z.object({
    scope: z
      .enum(["hoy", "vencidas", "bandeja", "diarias", "todas"])
      .optional(),
    project_id: z.string().uuid().optional(),
    project_name: z.string().trim().max(200).optional(),
    priority: z.array(priority).optional(),
    status: z.array(taskStatus).optional(),
    sin_fecha: z.boolean().optional(),
    due_on: isoDate.optional(),
  }),
  actualizar_tarea: z.object({
    task_id: z.string().uuid(),
    title: z.string().trim().min(1).max(500).optional(),
    notes: z.string().trim().max(5000).optional(),
    priority: priority.nullable().optional(),
    status: taskStatus.optional(),
    due_at: isoDate.nullable().optional(),
    project_id: z.string().uuid().nullable().optional(),
    is_daily: z.boolean().optional(),
  }),
  completar_tarea: z.object({
    task_id: z.string().uuid(),
  }),
  crear_proyecto: z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    status: projectStatus.optional(),
    color: z.string().trim().max(40).optional(),
    icon: z.string().trim().max(16).optional(),
  }),
  consultar_proyectos: z.object({
    only_ideas: z.boolean().optional(),
  }),
} as const;

export type ToolName = keyof typeof toolInputSchemas;

// --- Definiciones para la API de Anthropic (JSON Schema, strict) ---

export const tools: Anthropic.Tool[] = [
  {
    name: "crear_tarea",
    description:
      "Crea una tarea nueva. Usa project_id si conoces el proyecto (esta en el contexto del sistema); si el usuario nombra un proyecto que no reconoces, pasa project_name y el sistema intenta emparejarlo. Fechas en formato YYYY-MM-DD. status por defecto 'todo'; usa 'inbox' para captura rapida sin clasificar.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", description: "Titulo de la tarea" },
        notes: { type: "string", description: "Notas o detalle" },
        project_id: { type: "string", description: "UUID del proyecto" },
        project_name: {
          type: "string",
          description: "Nombre del proyecto (si no tienes el id)",
        },
        priority: { type: "string", enum: ["alta", "media", "baja"] },
        status: {
          type: "string",
          enum: ["inbox", "todo", "en_progreso", "hecho"],
        },
        due_at: { type: "string", description: "Fecha de entrega YYYY-MM-DD" },
        received_at: {
          type: "string",
          description: "Fecha recibida YYYY-MM-DD",
        },
        category: { type: "string" },
        is_daily: { type: "boolean", description: "Es una tarea diaria" },
      },
      required: ["title"],
    },
  },
  {
    name: "consultar_tareas",
    description:
      "Consulta tareas del usuario con filtros. scope: 'hoy' (vencen hoy), 'vencidas', 'bandeja' (inbox), 'diarias', o 'todas'. Devuelve id, titulo, prioridad, estado, fecha y proyecto. Usa los id devueltos para actualizar o completar.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        scope: {
          type: "string",
          enum: ["hoy", "vencidas", "bandeja", "diarias", "todas"],
        },
        project_id: { type: "string" },
        project_name: { type: "string" },
        priority: {
          type: "array",
          items: { type: "string", enum: ["alta", "media", "baja"] },
        },
        status: {
          type: "array",
          items: {
            type: "string",
            enum: ["inbox", "todo", "en_progreso", "hecho"],
          },
        },
        sin_fecha: {
          type: "boolean",
          description: "Solo tareas sin fecha de entrega",
        },
        due_on: { type: "string", description: "Tareas que vencen en YYYY-MM-DD" },
      },
      required: [],
    },
  },
  {
    name: "actualizar_tarea",
    description:
      "Actualiza una tarea existente por su id (obtenlo con consultar_tareas). Solo cambia los campos que envies. Para quitar la fecha o la prioridad envia null.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        task_id: { type: "string", description: "UUID de la tarea" },
        title: { type: "string" },
        notes: { type: "string" },
        priority: {
          anyOf: [
            { type: "string", enum: ["alta", "media", "baja"] },
            { type: "null" },
          ],
        },
        status: {
          type: "string",
          enum: ["inbox", "todo", "en_progreso", "hecho"],
        },
        due_at: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "YYYY-MM-DD o null para quitar",
        },
        project_id: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        is_daily: { type: "boolean" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "completar_tarea",
    description:
      "Marca una tarea como realizada (estado 'hecho' con fecha de completado). Requiere el id de la tarea.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        task_id: { type: "string", description: "UUID de la tarea" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "crear_proyecto",
    description:
      "Crea un proyecto nuevo. Usa status 'idea' para el banco de ideas o 'activo' para un proyecto en marcha (por defecto 'activo'). icon es un emoji.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        status: {
          type: "string",
          enum: ["idea", "activo", "pausado", "hecho", "archivado"],
        },
        color: { type: "string" },
        icon: { type: "string", description: "Emoji" },
      },
      required: ["name"],
    },
  },
  {
    name: "consultar_proyectos",
    description:
      "Lista los proyectos del usuario con su id, nombre y estado. only_ideas=true devuelve solo el banco de ideas.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        only_ideas: { type: "boolean" },
      },
      required: [],
    },
  },
];
