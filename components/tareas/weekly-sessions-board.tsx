"use client";
// components/tareas/weekly-sessions-board.tsx
// Panel semanal de sesiones repetitivas: 7 columnas (lunes a domingo), cada una
// con las tareas semanales programadas ese dia. Hoy se resalta y es el UNICO
// dia donde se puede "Hacer ahora" (activar el cronometro de 50 min, mismo
// compartido con Proceso): no tiene sentido activar el cronometro de una
// sesion de un dia que todavia no llega o que ya paso. Cualquier dia (pasado,
// hoy o futuro) admite marcar/desmarcar su casilla de "hecha esa sesion ese
// dia" — asi se ve el avance real semana a semana, sin que una tarea
// recurrente se de nunca por "terminada para siempre".
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task, TaskWeeklyCompletion, TaskWithProject } from "@/types/db";
import {
  completeWeeklyOccurrenceAction,
  getWeeklyCompletionsAction,
  uncompleteWeeklyOccurrenceAction,
} from "@/lib/db/actions";
import { toDateColumn } from "@/lib/utils/dates";
import { isoWeekday, weeklyDaysOf } from "@/lib/utils/weekdays";
import { addWeekOffset, getWeekDays, weekRangeLabel } from "@/lib/utils/week-range";
import { semaphoreTone, urgencySemaphore } from "@/lib/utils/urgency";
import { useDoingSessions, useStopIfDoing } from "@/components/tareas/doing-sessions-context";
import { SessionTimerControls } from "@/components/tareas/session-timer-controls";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAY_LABEL_LONG: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
  7: "Domingo",
};
const DAY_LABEL_SHORT: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mie",
  4: "Jue",
  5: "Vie",
  6: "Sab",
  7: "Dom",
};

function monthShort(date: Date): string {
  return date.toLocaleDateString("es-CO", { month: "short" }).replace(".", "");
}

function completionKey(taskId: string, dateISO: string): string {
  return `${taskId}__${dateISO}`;
}

/**
 * Una sesion en un dia concreto. El titulo es un boton (como en KanbanCard):
 * el checkbox y los controles del cronometro son hermanos con su propio clic,
 * NUNCA anidados dentro de otro <button> (HTML invalido: un boton dentro de
 * otro se cierra/reordena de forma impredecible y rompe el clic real).
 */
function WeeklySessionCard({
  task,
  dateISO,
  isToday,
  completed,
  pending,
  onToggleCompletion,
  onEdit,
}: {
  task: TaskWithProject;
  dateISO: string;
  isToday: boolean;
  completed: boolean;
  /** Ya hay una peticion en curso para esta casilla: se deshabilita para que un
   * segundo clic rapido no dispare una peticion contraria antes de que la
   * primera termine (INSERT y DELETE cruzados en el servidor por el orden de
   * llegada, dejando la base en un estado que el optimismo del cliente no
   * refleja hasta el siguiente refresco). */
  pending: boolean;
  onToggleCompletion: (taskId: string, dateISO: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
}) {
  const { doingTaskIds, doingTimers, toggleDoing, pauseDoing, resumeDoing } =
    useDoingSessions();
  const isDoing = doingTaskIds.includes(task.id);
  const semaforo = urgencySemaphore({
    priority: task.priority,
    dueAt: task.due_at,
    done: false,
  });
  const tone = semaforo ? semaphoreTone(semaforo) : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5 shadow-xs",
        isDoing && "border-emerald-500/80 bg-emerald-500/10 ring-1 ring-emerald-500/35",
        !isDoing && tone && [tone.border, tone.soft],
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={completed}
          disabled={pending}
          onCheckedChange={() => onToggleCompletion(task.id, dateISO, completed)}
          aria-label={completed ? "Desmarcar sesion del dia" : "Marcar sesion del dia como hecha"}
          className="mt-0.5 border-muted-foreground/50 bg-background shadow-xs"
        />
        <button
          type="button"
          onClick={() => onEdit(task)}
          className={cn(
            "min-w-0 flex-1 text-left text-xs leading-snug hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </button>
      </div>
      {isToday ? (
        <div className="pl-6">
          <SessionTimerControls
            taskId={task.id}
            isDoing={isDoing}
            timer={doingTimers[task.id]}
            onToggleDoing={toggleDoing}
            onPauseTimer={pauseDoing}
            onResumeTimer={resumeDoing}
            activateLabel="Hacer ahora"
          />
        </div>
      ) : null}
    </div>
  );
}

export function WeeklySessionsBoard({
  weeklyTasks,
  initialCompletions,
  onEdit,
}: {
  weeklyTasks: TaskWithProject[];
  initialCompletions: TaskWeeklyCompletion[];
  onEdit: (task: Task) => void;
}) {
  const router = useRouter();
  const stopIfDoing = useStopIfDoing();
  const [weekOffset, setWeekOffset] = useState(0);
  const [completions, setCompletions] = useState<TaskWeeklyCompletion[]>(initialCompletions);
  const [loadingWeek, setLoadingWeek] = useState(false);
  // Casillas con una peticion en curso: bloquea el doble clic rapido que
  // podria mandar un INSERT y un DELETE para la misma (tarea, dia) casi a la
  // vez, con el servidor resolviendolos en el orden que le toque.
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  // "Hoy" se resuelve tras montar, nunca durante el render/SSR: el servidor
  // (Vercel, en UTC) y el navegador de la persona (Colombia, UTC-5) pueden
  // discrepar en que dia es cerca de la medianoche, y calcularlo durante el
  // render produciria un desajuste de hidratacion (mismo motivo que
  // calendar-month.tsx difiere su propio "hoy").
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
  }, []);

  // Reconciliar con datos frescos del servidor SOLO si se esta viendo la
  // semana actual: si el usuario esta consultando una semana pasada/futura, un
  // refresco de la app (por otra mutacion cualquiera) no debe pisarle la vista.
  useEffect(() => {
    if (weekOffset === 0) setCompletions(initialCompletions);
  }, [initialCompletions, weekOffset]);

  async function goToWeek(nextOffset: number) {
    if (!today) return;
    setWeekOffset(nextOffset);
    if (nextOffset === 0) {
      setCompletions(initialCompletions);
      return;
    }
    setLoadingWeek(true);
    try {
      const nextDays = getWeekDays(addWeekOffset(today, nextOffset));
      const data = await getWeeklyCompletionsAction(
        toDateColumn(nextDays[0]),
        toDateColumn(nextDays[6]),
      );
      setCompletions(data);
    } catch {
      toast.error("No se pudo cargar esa semana. Intenta de nuevo.");
    } finally {
      setLoadingWeek(false);
    }
  }

  async function handleToggleCompletion(taskId: string, dateISO: string, wasCompleted: boolean) {
    const key = completionKey(taskId, dateISO);
    if (pendingKeys.has(key)) return; // ya hay una peticion en curso para esta casilla
    setPendingKeys((current) => new Set(current).add(key));

    // Optimista: se ve al instante, se confirma en el servidor detras.
    setCompletions((current) =>
      wasCompleted
        ? current.filter((c) => !(c.task_id === taskId && c.completed_date === dateISO))
        : [
            ...current,
            {
              id: `optimista-${taskId}-${dateISO}`,
              user_id: "",
              task_id: taskId,
              completed_date: dateISO,
              created_at: new Date().toISOString(),
            },
          ],
    );
    try {
      if (wasCompleted) {
        await uncompleteWeeklyOccurrenceAction(taskId, dateISO);
      } else {
        await completeWeeklyOccurrenceAction(taskId, dateISO);
        // Si se completa la sesion de HOY y el cronometro seguia corriendo,
        // la sesion ya termino: no tiene sentido dejarlo activo.
        if (today && dateISO === toDateColumn(today)) stopIfDoing(taskId);
      }
      router.refresh();
    } catch {
      toast.error("No se pudo guardar. Intenta de nuevo.");
      if (today) {
        const currentDays = getWeekDays(addWeekOffset(today, weekOffset));
        try {
          const data = await getWeeklyCompletionsAction(
            toDateColumn(currentDays[0]),
            toDateColumn(currentDays[6]),
          );
          setCompletions(data);
        } catch {
          // Si tampoco esto funciona, la persona lo nota y puede reintentar:
          // no hay nada mas seguro que hacer aqui sin datos frescos.
        }
      }
    } finally {
      setPendingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  if (weeklyTasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        Ninguna tarea con dias fijos de la semana. Abre una tarea y elige sus
        dias para que se repita.
      </p>
    );
  }

  if (!today) {
    // Esqueleto minimo mientras se resuelve "hoy" en el cliente (ver arriba).
    return <div className="h-40 animate-pulse rounded-lg bg-muted/40" />;
  }

  const days = getWeekDays(addWeekOffset(today, weekOffset));
  const dayISOs = days.map((d) => toDateColumn(d));
  const todayISO = toDateColumn(today);
  const completedSet = new Set(
    completions.map((c) => completionKey(c.task_id, c.completed_date)),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => void goToWeek(weekOffset - 1)}
          aria-label="Semana anterior"
          disabled={loadingWeek}
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium capitalize">{weekRangeLabel(days)}</span>
          {weekOffset !== 0 ? (
            <button
              type="button"
              onClick={() => void goToWeek(0)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Volver a esta semana
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Esta semana</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => void goToWeek(weekOffset + 1)}
          aria-label="Semana siguiente"
          disabled={loadingWeek}
        >
          <ChevronRight />
        </Button>
      </div>

      {/* Escritorio / tablet: 7 columnas lado a lado. */}
      <div className="hidden gap-2 md:grid md:grid-cols-7">
        {days.map((day, index) => {
          const dateISO = dayISOs[index];
          const weekday = isoWeekday(day);
          const isToday = dateISO === todayISO;
          const dayTasks = weeklyTasks.filter((t) => weeklyDaysOf(t).includes(weekday));
          return (
            <div key={dateISO} className="flex min-w-0 flex-col gap-2">
              <div
                className={cn(
                  "rounded-md px-2 py-1 text-center",
                  isToday ? "bg-primary text-primary-foreground" : "bg-muted/50",
                )}
              >
                <p className="text-xs font-semibold">{DAY_LABEL_SHORT[weekday]}</p>
                <p className="text-[11px] tabular-nums opacity-80">
                  {day.getDate()} {monthShort(day)}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {dayTasks.length ? (
                  dayTasks.map((task) => (
                    <WeeklySessionCard
                      key={task.id}
                      task={task}
                      dateISO={dateISO}
                      isToday={isToday}
                      completed={completedSet.has(completionKey(task.id, dateISO))}
                      pending={pendingKeys.has(completionKey(task.id, dateISO))}
                      onToggleCompletion={handleToggleCompletion}
                      onEdit={onEdit}
                    />
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-border/60 px-2 py-4 text-center text-[11px] text-muted-foreground/70">
                    Sin sesiones
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Movil: un dia debajo del otro, mismas tarjetas. */}
      <div className="flex flex-col gap-4 md:hidden">
        {days.map((day, index) => {
          const dateISO = dayISOs[index];
          const weekday = isoWeekday(day);
          const isToday = dateISO === todayISO;
          const dayTasks = weeklyTasks.filter((t) => weeklyDaysOf(t).includes(weekday));
          if (dayTasks.length === 0) return null;
          return (
            <div key={dateISO} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className={cn("text-sm font-semibold", isToday && "text-primary")}>
                  {DAY_LABEL_LONG[weekday]}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {day.getDate()} {monthShort(day)}
                  {isToday ? " · hoy" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {dayTasks.map((task) => (
                  <WeeklySessionCard
                    key={task.id}
                    task={task}
                    dateISO={dateISO}
                    isToday={isToday}
                    completed={completedSet.has(completionKey(task.id, dateISO))}
                    pending={pendingKeys.has(completionKey(task.id, dateISO))}
                    onToggleCompletion={handleToggleCompletion}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklySessionsBoard;
