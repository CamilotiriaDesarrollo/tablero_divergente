// lib/utils/weekdays.ts
// Dias de la semana para las tareas semanales. Se usa el criterio ISO-8601
// (1 = lunes .. 7 = domingo), el mismo con el que el calendario arma las
// semanas, para que "todos los lunes" caiga siempre en la primera columna.
//
// Ojo: Date.getDay() de JavaScript usa 0 = domingo. La conversion vive aqui y
// en ningun otro sitio, para no repetir el error de calculo.

/** Dias validos, en el orden en que se muestran. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Inicial para los botones del selector. Miercoles es X para no repetir M. */
export const WEEKDAY_INITIAL: Record<number, string> = {
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
  7: "D",
};

export const WEEKDAY_NAME: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado",
  7: "domingo",
};

/** Dia ISO (1..7) de una fecha. */
export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/** Lee los dias de repeticion tolerando que la columna aun no exista. */
export function weeklyDaysOf(task: { weekly_days?: number[] | null }): number[] {
  return task.weekly_days ?? [];
}

/** True si la tarea se repite algun dia de la semana. */
export function esSemanal(task: { weekly_days?: number[] | null }): boolean {
  return weeklyDaysOf(task).length > 0;
}

/**
 * Frase legible de la repeticion: "Todos los lunes", "Lunes y jueves",
 * "Lunes, miercoles y viernes", "Todos los dias" cuando estan los siete.
 */
export function repeticionSemanalLabel(days: number[]): string {
  const ordenados = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort();
  if (ordenados.length === 0) return "";
  if (ordenados.length === 7) return "Todos los dias";
  const nombres = ordenados.map((d) => WEEKDAY_NAME[d]);
  if (nombres.length === 1) return `Todos los ${nombres[0]}`;
  const ultimo = nombres[nombres.length - 1];
  return `${nombres.slice(0, -1).join(", ")} y ${ultimo}`;
}
