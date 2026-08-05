// lib/utils/week-range.ts
// Rango de una semana (lunes a domingo) para el panel de sesiones semanales.
// Mismo criterio que el calendario (components/calendario/month-range.ts): la
// semana empieza en lunes.
//
// A diferencia del mes, la semana del panel de sesiones NO se guarda en la URL
// (?semana=...): tareas-view.tsx es un solo componente cliente con 4 pestanas
// (Tabla/Proceso/Tiempo/Repetitivas) montadas por un Tabs que DESMONTA el
// contenido inactivo; atar la semana a un parametro de pagina forzaria un
// re-render de las 4 pestanas en cada "semana siguiente" y perderia el estado
// de las otras (orden de Kanban, filtros de tabla, etc.). Por eso el offset de
// semana vive como estado de cliente en WeeklySessionsBoard.
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** Lunes de la semana que contiene `date`. */
export function startOfWeekMonday(date: Date): Date {
  return startOfWeek(date, WEEK_OPTS);
}

/** Los 7 dias (lunes a domingo) de la semana que contiene `date`. */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Semana desplazada `offset` semanas desde la de `date` (negativo = atras). */
export function addWeekOffset(date: Date, offset: number): Date {
  return addWeeks(date, offset);
}

/** "Semana del 4 al 10 de agosto" para el encabezado del panel. */
export function weekRangeLabel(days: Date[]): string {
  if (days.length === 0) return "";
  const first = days[0];
  const last = days[days.length - 1];
  const sameMonth = format(first, "MM") === format(last, "MM");
  const from = format(first, "d", { locale: es });
  const to = sameMonth
    ? `${format(last, "d")} de ${format(last, "MMMM", { locale: es })}`
    : `${format(last, "d 'de' MMMM", { locale: es })}`;
  return `Semana del ${from} al ${to}`;
}
