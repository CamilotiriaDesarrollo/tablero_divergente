// Vocabulario y opciones del modulo de tareas (BLUEPRINT seccion 4).
// Un control mantiene su nombre en todo el flujo (CLAUDE.md).
import type { TaskStatus } from "@/types/db";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: "Bandeja",
  todo: "Por hacer",
  en_progreso: "En progreso",
  hecho: "Finalizadas",
};

/** Estados del tablero (sin bandeja). Orden de columnas del Kanban. */
export const BOARD_STATUSES: TaskStatus[] = ["todo", "en_progreso", "hecho"];

/** Estados a los que se puede mover una tarea desde el menu de acciones. */
export const MOVABLE_STATUSES: TaskStatus[] = ["todo", "en_progreso", "hecho"];

/** Categoria de la tarea: intencion con la que se hace (el dueno lo pidio asi). */
export const CATEGORY_OPTIONS = [
  "productividad",
  "aprendizaje",
  "disfrute",
  "inspiracional",
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  productividad: "Productividad",
  aprendizaje: "Aprendizaje",
  disfrute: "Disfrute",
  inspiracional: "Inspiracional",
};

/** Emoji por categoria (senal sutil en la UI, nunca decision). */
export const CATEGORY_EMOJI: Record<string, string> = {
  productividad: "🎯",
  aprendizaje: "📚",
  disfrute: "🌿",
  inspiracional: "✨",
};

/** Centinela para "sin seleccion" en los Select (base-ui no permite value vacio). */
export const NONE_VALUE = "__none__";
