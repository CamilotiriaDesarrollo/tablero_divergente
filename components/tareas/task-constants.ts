// Vocabulario y opciones del modulo de tareas (BLUEPRINT seccion 4).
// Un control mantiene su nombre en todo el flujo (CLAUDE.md).
import type { TaskStatus } from "@/types/db";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: "Bandeja",
  todo: "Por hacer",
  en_progreso: "En progreso",
  hecho: "Hecho",
};

/** Estados del tablero (sin bandeja). Orden de columnas del Kanban. */
export const BOARD_STATUSES: TaskStatus[] = ["todo", "en_progreso", "hecho"];

/** Estados a los que se puede mover una tarea desde el menu de acciones. */
export const MOVABLE_STATUSES: TaskStatus[] = ["todo", "en_progreso", "hecho"];

/** Tipos de tarea (multi) de la plantilla (BLUEPRINT seccion 4). */
export const TASK_TYPE_OPTIONS = [
  "video",
  "publicaciones",
  "estudio",
  "produccion",
  "investigacion",
  "presentacion",
] as const;

export const TASK_TYPE_LABEL: Record<string, string> = {
  video: "Video",
  publicaciones: "Publicaciones",
  estudio: "Estudio",
  produccion: "Produccion",
  investigacion: "Investigacion",
  presentacion: "Presentacion",
};

/** Categorias base (extensible) de la plantilla (BLUEPRINT seccion 4). */
export const CATEGORY_OPTIONS = [
  "aprendizaje",
  "redes",
  "cursos",
  "video",
  "conferencias",
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  aprendizaje: "Aprendizaje",
  redes: "Redes",
  cursos: "Cursos",
  video: "Video",
  conferencias: "Conferencias",
};

/** Centinela para "sin seleccion" en los Select (base-ui no permite value vacio). */
export const NONE_VALUE = "__none__";
