// lib/utils/dates.ts
// Logica de fechas pura (BLUEPRINT seccion 4: dias_restantes y buckets de tiempo).
// No decide nada: solo calcula la senal. La UI decide el orden.
import {
  differenceInCalendarDays,
  parseISO,
  isValid,
  format,
  startOfToday,
} from "date-fns";
import { es } from "date-fns/locale";

/** Buckets de tiempo de la plantilla: Hoy / 1-14 / 15-30 / 30+, mas vencido y sin fecha. */
export type TimeBucket =
  | "vencido"
  | "hoy"
  | "dias_1_14"
  | "dias_15_30"
  | "dias_30_mas"
  | "sin_fecha";

export const TIME_BUCKET_ORDER: TimeBucket[] = [
  "vencido",
  "hoy",
  "dias_1_14",
  "dias_15_30",
  "dias_30_mas",
  "sin_fecha",
];

export const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
  vencido: "Vencido",
  hoy: "Hoy",
  dias_1_14: "1 a 14 dias",
  dias_15_30: "15 a 30 dias",
  dias_30_mas: "30+ dias",
  sin_fecha: "Sin fecha",
};

/** Convierte una fecha (Date | string ISO/fecha) a Date valida, o null. */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

/**
 * Dias restantes hasta la fecha de entrega, en dias de calendario.
 * Negativo = vencido. 0 = hoy. null si no hay fecha.
 */
export function diasRestantes(dueAt: string | Date | null | undefined): number | null {
  const due = toDate(dueAt);
  if (!due) return null;
  return differenceInCalendarDays(due, startOfToday());
}

/** Clasifica una fecha de entrega en su bucket de tiempo. */
export function timeBucket(dueAt: string | Date | null | undefined): TimeBucket {
  const d = diasRestantes(dueAt);
  if (d === null) return "sin_fecha";
  if (d < 0) return "vencido";
  if (d === 0) return "hoy";
  if (d <= 14) return "dias_1_14";
  if (d <= 30) return "dias_15_30";
  return "dias_30_mas";
}

/** Etiqueta corta y humana de los dias restantes, para el dato mono en la tarjeta. */
export function diasRestantesLabel(dueAt: string | Date | null | undefined): string {
  const d = diasRestantes(dueAt);
  if (d === null) return "sin fecha";
  if (d === 0) return "hoy";
  if (d === 1) return "manana";
  if (d === -1) return "ayer";
  if (d < 0) return `hace ${Math.abs(d)} d`;
  return `en ${d} d`;
}

/** Formato de fecha para la interfaz (es). */
export function formatFecha(
  value: string | Date | null | undefined,
  pattern = "d MMM",
): string {
  const d = toDate(value);
  if (!d) return "";
  return format(d, pattern, { locale: es });
}

/** Formato ISO de solo fecha (YYYY-MM-DD) para columnas date de Postgres. */
export function toDateColumn(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

/** True si la fecha de entrega es hoy. */
export function esHoy(dueAt: string | Date | null | undefined): boolean {
  return diasRestantes(dueAt) === 0;
}

/** True si esta vencida (antes de hoy). */
export function estaVencida(dueAt: string | Date | null | undefined): boolean {
  const d = diasRestantes(dueAt);
  return d !== null && d < 0;
}
