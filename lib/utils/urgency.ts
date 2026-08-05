// lib/utils/urgency.ts
// El medidor de urgencia es el elemento FIRMA de la app (BLUEPRINT seccion 6).
// Traduce prioridad + dias restantes en una SENAL (0..100 y un nivel). Sugiere,
// NUNCA reordena por su cuenta. Filosofia: los datos no deciden, las personas si.
import type { Priority } from "@/types/db";
import { diasRestantes, timeBucket } from "@/lib/utils/dates";

export type UrgencyLevel = "critica" | "elevada" | "moderada" | "tranquila";

export interface UrgencySignal {
  /** 0..100 para el llenado del medidor. */
  score: number;
  level: UrgencyLevel;
  /** Texto corto para tooltip/lectura, sin em-dashes. */
  reason: string;
}

// El peso de la prioridad domina; la proximidad modula. Ambos son senal.
const PRIORITY_WEIGHT: Record<Priority | "ninguna", number> = {
  alta: 1,
  media: 0.6,
  baja: 0.3,
  ninguna: 0.15,
};

function proximityWeight(dueAt: string | Date | null | undefined): number {
  const bucket = timeBucket(dueAt);
  switch (bucket) {
    case "vencido":
      return 1;
    case "hoy":
      return 0.9;
    case "dias_1_14": {
      // Dentro de la quincena, mas cerca = mas peso (0.5 .. 0.75).
      const d = diasRestantes(dueAt) ?? 14;
      return 0.75 - (d / 14) * 0.25;
    }
    case "dias_15_30":
      return 0.4;
    case "dias_30_mas":
      return 0.2;
    case "sin_fecha":
    default:
      return 0.25;
  }
}

function priorityLabel(priority: Priority | null): string {
  switch (priority) {
    case "alta":
      return "Prioridad alta";
    case "media":
      return "Prioridad media";
    case "baja":
      return "Prioridad baja";
    default:
      return "Sin prioridad";
  }
}

function proximityLabel(dueAt: string | Date | null | undefined): string {
  switch (timeBucket(dueAt)) {
    case "vencido":
      return "ya vencida";
    case "hoy":
      return "vence hoy";
    case "dias_1_14":
      return "vence esta quincena";
    case "dias_15_30":
      return "vence este mes";
    case "dias_30_mas":
      return "con margen amplio";
    case "sin_fecha":
    default:
      return "sin fecha de entrega";
  }
}

/**
 * Calcula la senal de urgencia de una tarea a partir de su prioridad y fecha.
 * Las tareas ya hechas devuelven urgencia nula (tranquila).
 */
export function urgencySignal(input: {
  priority: Priority | null;
  dueAt: string | Date | null | undefined;
  done?: boolean;
}): UrgencySignal {
  if (input.done) {
    return { score: 0, level: "tranquila", reason: "Realizada" };
  }

  const pw = PRIORITY_WEIGHT[input.priority ?? "ninguna"];
  const prox = proximityWeight(input.dueAt);
  // La prioridad pesa mas que la proximidad: la persona marca lo que importa.
  const raw = 0.58 * pw + 0.42 * prox;
  const score = Math.round(Math.min(100, Math.max(0, raw * 100)));

  const level: UrgencyLevel =
    score >= 75
      ? "critica"
      : score >= 50
        ? "elevada"
        : score >= 30
          ? "moderada"
          : "tranquila";

  const reason = `${priorityLabel(input.priority)}, ${proximityLabel(input.dueAt)}`;

  return { score, level, reason };
}

/** Token de color de prioridad para clases Tailwind (bg-priority-*, text-priority-*). */
export function priorityToken(priority: Priority | null): string | null {
  if (!priority) return null;
  return `priority-${priority}`;
}

export const PRIORITY_EMOJI: Record<Priority, string> = {
  alta: "🔥",
  media: "⚖️",
  baja: "❄️",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

// ---------- Semaforo de urgencia (borde de tarjeta) ----------
// Mismo score de urgencySignal(), en solo 3 bandas para que el color se lea de
// un vistazo sin abrir el tooltip del medidor. A proposito usa rojo/ambar/
// esmeralda LITERALES (no los tokens priority-alta/media/baja): la urgencia y
// la prioridad son dos senales distintas (una vencida de prioridad baja es muy
// urgente mostrando el ambar de prioridad haria pensar que es alta prioridad).

export type UrgencySemaphore = "roja" | "amarilla" | "verde";

export interface SemaphoreTone {
  /** Borde de la tarjeta. */
  border: string;
  /** Fondo tenue a juego con el borde. */
  soft: string;
}

const SEMAPHORE_TONE: Record<UrgencySemaphore, SemaphoreTone> = {
  roja: { border: "border-red-500/70", soft: "bg-red-500/5" },
  amarilla: { border: "border-amber-500/70", soft: "bg-amber-500/5" },
  verde: { border: "border-emerald-500/70", soft: "bg-emerald-500/5" },
};

/**
 * Banda semaforo a partir del mismo score 0-100 de urgencySignal(). null solo
 * para tareas ya hechas (borde neutro, ni urgente ni tranquila: ya no aplica).
 */
export function urgencySemaphore(input: {
  priority: Priority | null;
  dueAt: string | Date | null | undefined;
  done?: boolean;
}): UrgencySemaphore | null {
  if (input.done) return null;
  const { score } = urgencySignal(input);
  if (score >= 75) return "roja";
  if (score >= 50) return "amarilla";
  return "verde";
}

export function semaphoreTone(level: UrgencySemaphore): SemaphoreTone {
  return SEMAPHORE_TONE[level];
}

/**
 * Comparador SUGERIDO por urgencia (desc). Es opt-in: la UI lo ofrece como
 * "ordenar por urgencia", pero el orden por defecto respeta position (manual).
 */
export function byUrgencyDesc(
  a: { priority: Priority | null; due_at: string | null; status: string },
  b: { priority: Priority | null; due_at: string | null; status: string },
): number {
  const sa = urgencySignal({
    priority: a.priority,
    dueAt: a.due_at,
    done: a.status === "hecho",
  }).score;
  const sb = urgencySignal({
    priority: b.priority,
    dueAt: b.due_at,
    done: b.status === "hecho",
  }).score;
  return sb - sa;
}
