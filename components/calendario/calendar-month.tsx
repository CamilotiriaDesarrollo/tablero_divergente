"use client";
// components/calendario/calendar-month.tsx
// Vista de mes: grilla de 7 columnas con semanas completas (lunes a domingo),
// dia de hoy resaltado con el acento, dias fuera del mes atenuados. Ubica las
// tareas por due_at. En movil cae a una lista por dia (el grid no cabe).
// El componente recibe las tareas ya consultadas por la page.tsx (RSC).
//
// FASE 2 (pendiente, opcional): reprogramar por arrastre con dnd-kit. Arrastrar
// una TaskChip a otra celda llamaria updateTaskAction(id, { due_at }) y luego
// router.refresh(). No se implementa aqui para mantener el alcance acotado.
import * as React from "react";
import { PlusIcon } from "lucide-react";
import { isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { toDateColumn } from "@/lib/utils/dates";
import type { TaskWithProject } from "@/types/db";
import { MonthNav } from "./month-nav";
import { CalendarDayCell, TaskChip } from "./calendar-day-cell";
import { DayCreateDialog } from "./day-create-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import {
  WEEKDAY_LABELS,
  getMonthDays,
  getMonthGridDays,
  parseMonthParam,
  weekdayShort,
} from "./month-range";

const MAX_VISIBLE = 3;

export function CalendarMonth({
  monthISO,
  tasks,
}: {
  monthISO: string;
  tasks: TaskWithProject[];
}) {
  const ref = React.useMemo(() => parseMonthParam(monthISO), [monthISO]);
  const gridDays = React.useMemo(() => getMonthGridDays(ref), [ref]);
  const monthDays = React.useMemo(() => getMonthDays(ref), [ref]);

  // Agrupa las tareas por columna de fecha (YYYY-MM-DD) para lectura O(1) por dia.
  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, TaskWithProject[]>();
    for (const task of tasks) {
      if (!task.due_at) continue;
      const key = task.due_at.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [tasks]);

  // "Hoy" es relativo al cliente: se calcula tras montar para evitar desajustes
  // de hidratacion entre la zona horaria del servidor y la del navegador.
  const [todayISO, setTodayISO] = React.useState<string | null>(null);
  React.useEffect(() => {
    setTodayISO(toDateColumn(new Date()));
  }, []);

  const [createDay, setCreateDay] = React.useState<Date | null>(null);
  const [detailTask, setDetailTask] = React.useState<TaskWithProject | null>(null);

  const handleCreateDay = React.useCallback((date: Date) => setCreateDay(date), []);
  const handleSelectTask = React.useCallback(
    (task: TaskWithProject) => setDetailTask(task),
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <MonthNav monthISO={monthISO} />

      {tasks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay tareas con fecha este mes. Toca un dia para crear la primera.
        </p>
      )}

      {/* Vista de grilla (tablet y escritorio). */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <div className="grid grid-cols-7 gap-px bg-border">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-muted/40 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
          {gridDays.map((day) => {
            const key = toDateColumn(day);
            return (
              <CalendarDayCell
                key={key}
                date={day}
                tasks={tasksByDay.get(key) ?? []}
                isOutside={!isSameMonth(day, ref)}
                isToday={todayISO === key}
                maxVisible={MAX_VISIBLE}
                onCreateDay={handleCreateDay}
                onSelectTask={handleSelectTask}
              />
            );
          })}
        </div>
      </div>

      {/* Vista de lista por dia (movil). */}
      <div className="overflow-hidden rounded-xl border border-border md:hidden">
        {monthDays.map((day) => {
          const key = toDateColumn(day);
          const dayTasks = tasksByDay.get(key) ?? [];
          const isToday = todayISO === key;
          return (
            <div key={key} className="border-b border-border last:border-b-0">
              <div className="flex items-center justify-between gap-2 px-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCreateDay(day)}
                  className="flex items-center gap-2 rounded-md py-0.5 text-left transition-colors"
                  aria-label={`Crear tarea el ${day.getDate()}`}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full font-mono text-xs tabular-nums",
                      isToday
                        ? "font-semibold text-foreground ring-2 ring-ring"
                        : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {weekdayShort(day)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateDay(day)}
                  aria-label={`Agregar tarea el ${day.getDate()}`}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
              <div className="flex flex-col gap-0.5 px-2 pb-2 pt-1">
                {dayTasks.length > 0 ? (
                  dayTasks.map((task) => (
                    <TaskChip key={task.id} task={task} onSelect={handleSelectTask} />
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCreateDay(day)}
                    className="rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    Sin tareas
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DayCreateDialog
        day={createDay}
        open={createDay !== null}
        onOpenChange={(open) => {
          if (!open) setCreateDay(null);
        }}
      />
      <TaskDetailDialog
        task={detailTask}
        open={detailTask !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTask(null);
        }}
      />
    </div>
  );
}
