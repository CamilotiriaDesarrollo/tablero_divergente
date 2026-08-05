"use client";
// Tarjeta arrastrable del tablero. Se puede tomar desde cualquier zona libre;
// el asa conserva soporte de teclado y hace visible la accion.
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Task, TaskWithProject } from "@/types/db";
import {
  completeTaskAction,
  reopenTaskAction,
} from "@/lib/db/actions";
import { diasRestantesLabel, dueDateTone } from "@/lib/utils/dates";
import type { DoingTimer } from "@/lib/utils/doing-timer";
import { semaphoreTone, urgencySemaphore } from "@/lib/utils/urgency";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityBadge } from "@/components/tareas/priority-badge";
import { UrgencyMeter } from "@/components/tareas/urgency-meter";
import { TaskActionsMenu } from "@/components/tareas/task-actions-menu";
import { SessionTimerControls } from "@/components/tareas/session-timer-controls";
import { useRunAction } from "@/components/tareas/use-run-action";
import { cn } from "@/lib/utils";
import { projectColorValue } from "@/components/proyectos/project-colors";

export function KanbanCard({
  task,
  onEdit,
  isDoing,
  onToggleDoing,
  timer,
  onPauseTimer,
  onResumeTimer,
}: {
  task: TaskWithProject;
  onEdit: (task: Task) => void;
  isDoing: boolean;
  onToggleDoing: (taskId: string) => void;
  /** Cronometro de foco de esta tarea, si esta "haciendo" (50 min, pausable). */
  timer?: DoingTimer;
  onPauseTimer: (taskId: string) => void;
  onResumeTimer: (taskId: string) => void;
}) {
  const { run } = useRunAction();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const done = task.status === "hecho";
  // El semaforo de urgencia queda por debajo del resaltado de "haciendo": ese
  // es el estado mas importante en pantalla (que estoy trabajando ahora
  // mismo), asi que no se lo disputa un borde de urgencia al mismo tiempo.
  const semaforo = isDoing
    ? null
    : urgencySemaphore({ priority: task.priority, dueAt: task.due_at, done });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-card p-2.5 shadow-xs active:cursor-grabbing",
        isDragging && "opacity-40",
        isDoing && "border-emerald-500/80 bg-emerald-500/10 ring-1 ring-emerald-500/35",
        semaforo && [semaphoreTone(semaforo).border, semaphoreTone(semaforo).soft],
      )}
      onPointerDown={(event) => {
        // Los controles internos conservan su propio clic y el asa su arrastre.
        if (event.target instanceof Element && event.target.closest("button")) return;
        listeners?.onPointerDown?.(event);
      }}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          aria-label="Arrastrar tarea"
          title="Arrastrar tarea"
          className="mt-0.5 cursor-grab touch-none rounded-sm text-muted-foreground/60 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <Checkbox
          checked={done}
          onCheckedChange={() =>
            run(
              () =>
                done ? reopenTaskAction(task.id) : completeTaskAction(task.id),
              { success: done ? "Tarea reabierta" : "Tarea realizada" },
            )
          }
          aria-label={done ? "Reabrir tarea" : "Realizar tarea"}
          // Fondo propio + borde mas marcado: sin esto, el cuadrito casi no se
          // ve (ni para tocarlo) sobre el tinte verde de una tarjeta "haciendo".
          className="mt-0.5 border-muted-foreground/50 bg-background shadow-xs"
        />
        <button
          type="button"
          onClick={() => onEdit(task)}
          className={cn(
            "flex-1 text-left text-sm leading-snug hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </button>
        <TaskActionsMenu task={task} onEdit={onEdit} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        {task.priority && (
          <PriorityBadge priority={task.priority} showLabel={false} />
        )}
        {task.project && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border/60 px-1.5 py-0.5 text-xs"
            style={{ color: projectColorValue(task.project.color) }}
          >
            {task.project.icon && <span aria-hidden>{task.project.icon}</span>}
            <span className="max-w-24 truncate">{task.project.name}</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pl-6">
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            dueDateTone(task.due_at, done),
          )}
        >
          {task.due_at ? diasRestantesLabel(task.due_at) : "sin fecha"}
        </span>
        <UrgencyMeter priority={task.priority} dueAt={task.due_at} done={done} />
      </div>

      {task.status === "en_progreso" ? (
        <div className="flex items-center justify-end pl-6">
          <SessionTimerControls
            taskId={task.id}
            isDoing={isDoing}
            timer={timer}
            onToggleDoing={onToggleDoing}
            onPauseTimer={onPauseTimer}
            onResumeTimer={onResumeTimer}
          />
        </div>
      ) : null}
    </div>
  );
}
