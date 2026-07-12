// components/calendario/month-range.ts
// Logica pura de rango de mes para el calendario (BLUEPRINT seccion 1).
// Sin "use client": lo importa tanto la page.tsx (RSC, para la consulta) como el
// Client Component (para reconstruir la grilla). Una sola fuente = server y
// cliente calculan el mismo mes. Semana empieza lunes; meses/dias en espanol.
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  parse,
  isValid,
} from "date-fns";
import { es } from "date-fns/locale";

/** Semana empieza el lunes (BLUEPRINT: weekStartsOn 1). */
export const WEEK_OPTS = { weekStartsOn: 1 as const };

/** Encabezados de dia (lunes primero), en ASCII para consistencia con el repo. */
export const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

// Indexado por getDay() (0=Dom .. 6=Sab).
const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

/** Etiqueta corta de dia de la semana (ASCII), p. ej. "Lun". */
export function weekdayShort(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()];
}

/**
 * Interpreta el parametro ?mes=YYYY-MM. Si falta o es invalido, usa el mes
 * actual. Devuelve el primer dia del mes a medianoche local.
 */
export function parseMonthParam(mes: string | undefined | null): Date {
  if (mes) {
    const parsed = parse(mes, "yyyy-MM", new Date());
    if (isValid(parsed)) return startOfMonth(parsed);
  }
  return startOfMonth(new Date());
}

/** Serializa un mes de referencia a YYYY-MM para el parametro de URL. */
export function toMonthParam(ref: Date): string {
  return format(ref, "yyyy-MM");
}

/**
 * Rango de la grilla del mes: expande el mes a semanas completas (lunes a
 * domingo). Es el rango exacto que se consulta con getTasksInRange.
 */
export function getMonthGridRange(ref: Date): { from: Date; to: Date } {
  const from = startOfWeek(startOfMonth(ref), WEEK_OPTS);
  const to = endOfWeek(endOfMonth(ref), WEEK_OPTS);
  return { from, to };
}

/** Todos los dias visibles en la grilla (semanas completas). */
export function getMonthGridDays(ref: Date): Date[] {
  const { from, to } = getMonthGridRange(ref);
  return eachDayOfInterval({ start: from, end: to });
}

/** Solo los dias del mes en curso (para la vista de lista en movil). */
export function getMonthDays(ref: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(ref), end: endOfMonth(ref) });
}

/** Titulo del mes con inicial mayuscula, p. ej. "Julio 2026". */
export function formatMonthTitle(ref: Date): string {
  const raw = format(ref, "LLLL yyyy", { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Etiqueta larga de un dia, p. ej. "Lun 7 de julio". */
export function formatDayLong(date: Date): string {
  return `${weekdayShort(date)} ${format(date, "d 'de' LLLL", { locale: es })}`;
}

/** Mes anterior / siguiente como parametro YYYY-MM. */
export function prevMonthParam(ref: Date): string {
  return toMonthParam(subMonths(ref, 1));
}
export function nextMonthParam(ref: Date): string {
  return toMonthParam(addMonths(ref, 1));
}
