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
import { isoWeekday, weeklyDaysOf } from "@/lib/utils/weekdays";
import type { TaskWithProject } from "@/types/db";
import { MonthNav } from "./month-nav";
import { CalendarDayCell, TaskChip } from "./calendar-day-cell";
import { DayCreateDialog } from "./day-create-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import {
  ALL_PROJECTS,
  NO_PROJECT,
  ProjectFilter,
  type ProjectFacet,
} from "./project-filter";
import {
  WEEKDAY_LABELS,
  getMonthDays,
  getMonthGridDays,
  parseMonthParam,
  weekdayShort,
} from "./month-range";

const MAX_VISIBLE = 3;
const PROJECT_FILTER_KEY = "tablero-divergente:calendario-proyecto";

export function CalendarMonth({
  monthISO,
  tasks,
  weeklyTasks = [],
}: {
  monthISO: string;
  tasks: TaskWithProject[];
  /** Tareas que se repiten en dias fijos: se pintan en cada dia que coincide. */
  weeklyTasks?: TaskWithProject[];
}) {
  const ref = React.useMemo(() => parseMonthParam(monthISO), [monthISO]);
  const gridDays = React.useMemo(() => getMonthGridDays(ref), [ref]);
  const monthDays = React.useMemo(() => getMonthDays(ref), [ref]);

  // Proyectos presentes en el mes, con su conteo: alimentan el filtro/leyenda.
  const facets = React.useMemo(() => {
    const map = new Map<string, ProjectFacet>();
    for (const task of tasks) {
      const id = task.project?.id ?? NO_PROJECT;
      const found = map.get(id);
      if (found) {
        found.count += 1;
        continue;
      }
      map.set(id, {
        id,
        name: task.project?.name ?? "Sin proyecto",
        icon: task.project?.icon ?? null,
        color: task.project?.color ?? null,
        count: 1,
      });
    }
    // Los que mas tareas tienen primero; "Sin proyecto" siempre al final.
    return [...map.values()].sort((a, b) => {
      if (a.id === NO_PROJECT) return 1;
      if (b.id === NO_PROJECT) return -1;
      return b.count - a.count || a.name.localeCompare(b.name);
    });
  }, [tasks]);

  // Filtro por proyecto. Se recuerda entre visitas y entre meses: si estas
  // mirando un proyecto puntual, cambiar de mes no deberia devolverte a todo.
  const [projectId, setProjectId] = React.useState<string>(ALL_PROJECTS);
  React.useEffect(() => {
    const saved = window.localStorage.getItem(PROJECT_FILTER_KEY);
    if (saved) setProjectId(saved);
  }, []);

  const selectProject = React.useCallback((id: string) => {
    setProjectId(id);
    if (id === ALL_PROJECTS) window.localStorage.removeItem(PROJECT_FILTER_KEY);
    else window.localStorage.setItem(PROJECT_FILTER_KEY, id);
  }, []);

  const filtering = projectId !== ALL_PROJECTS;
  const visibleTasks = React.useMemo(
    () =>
      filtering
        ? tasks.filter((task) => (task.project?.id ?? NO_PROJECT) === projectId)
        : tasks,
    [tasks, filtering, projectId],
  );

  // Las semanales tambien pasan por el filtro de proyecto.
  const visibleWeekly = React.useMemo(
    () =>
      filtering
        ? weeklyTasks.filter(
            (task) => (task.project?.id ?? NO_PROJECT) === projectId,
          )
        : weeklyTasks,
    [weeklyTasks, filtering, projectId],
  );

  // Agrupa las tareas por columna de fecha (YYYY-MM-DD) para lectura O(1) por dia.
  // Primero las de fecha fija y despues las repetitivas, que se copian en cada
  // dia de la rejilla cuyo dia de la semana coincide.
  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, TaskWithProject[]>();
    for (const task of visibleTasks) {
      if (!task.due_at) continue;
      const key = task.due_at.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(task);
      else map.set(key, [task]);
    }
    if (visibleWeekly.length) {
      for (const day of gridDays) {
        const weekday = isoWeekday(day);
        const matches = visibleWeekly.filter((task) =>
          weeklyDaysOf(task).includes(weekday),
        );
        if (!matches.length) continue;
        const key = toDateColumn(day);
        const list = map.get(key);
        if (list) list.push(...matches);
        else map.set(key, [...matches]);
      }
    }
    return map;
  }, [visibleTasks, visibleWeekly, gridDays]);

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

      <ProjectFilter
        facets={facets}
        total={tasks.length}
        selected={projectId}
        onSelect={selectProject}
      />

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay tareas con fecha este mes. Toca un dia para crear la primera.
        </p>
      ) : visibleTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este proyecto no tiene tareas con fecha en este mes.{" "}
          <button
            type="button"
            onClick={() => selectProject(ALL_PROJECTS)}
            className="rounded-sm underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver todos los proyectos
          </button>
        </p>
      ) : null}

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
                    <TaskChip
                      key={task.id}
                      task={task}
                      onSelect={handleSelectTask}
                      showProject
                    />
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
