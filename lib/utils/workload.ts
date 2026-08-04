// lib/utils/workload.ts
// Calculo del mapa de saturacion (los cuadritos por dia). Vive aqui y no dentro
// de una page para que Inicio y Tareas muestren EXACTAMENTE el mismo mapa: si
// el conteo se calculara en dos sitios, tarde o temprano dirian cosas distintas.
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { toDateColumn } from "@/lib/utils/dates";
import type { TaskWithProject } from "@/types/db";

export interface WorkloadDay {
  key: string;
  label: string;
  month: string;
  count: number;
  highPriority: number;
  isToday: boolean;
  isPast: boolean;
  tasks: TaskWithProject[];
}

/**
 * Arma la rejilla de saturacion a partir de las tareas abiertas con fecha de
 * entrega. Empieza el lunes de la semana en curso y cubre `weeks` semanas.
 */
export function buildWorkloadDays(
  openTasks: TaskWithProject[],
  { weeks = 16, now = new Date() }: { weeks?: number; now?: Date } = {},
): WorkloadDay[] {
  const todayStr = toDateColumn(now);

  const dueByDay = new Map<string, TaskWithProject[]>();
  for (const task of openTasks) {
    if (!task.due_at) continue;
    const key = toDateColumn(parseISO(task.due_at));
    dueByDay.set(key, [...(dueByDay.get(key) ?? []), task]);
  }

  const start = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = addDays(start, index);
    const key = toDateColumn(date);
    const tasks = dueByDay.get(key) ?? [];
    return {
      key,
      label: format(date, "EEEE d 'de' MMMM", { locale: es }),
      month: format(date, "MMM", { locale: es }),
      count: tasks.length,
      highPriority: tasks.filter((task) => task.priority === "alta").length,
      isToday: key === todayStr,
      isPast: key < todayStr,
      tasks,
    };
  });
}
