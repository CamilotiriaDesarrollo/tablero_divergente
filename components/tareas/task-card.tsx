"use client";
// Tarjeta compacta de tarea (vista por tiempo y reutilizable). Muestra titulo,
// proyecto, prioridad, fecha de entrega y dias restantes en mono, y el medidor
// de urgencia. Completar con la casilla; el resto de acciones en el menu.
import type { Task, TaskWithProject } from "@/types/db";
import {
  completeTaskAction,
  reopenTaskAction,
} from "@/lib/db/actions";
import { formatFecha, diasRestantesLabel, dueDateTone } from "@/lib/utils/dates";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityBadge } from "@/components/tareas/priority-badge";
import { UrgencyMeter } from "@/components/tareas/urgency-meter";
import { TaskActionsMenu } from "@/components/tareas/task-actions-menu";
import { useRunAction } from "@/components/tareas/use-run-action";
import { cn } from "@/lib/utils";
import { projectColorValue } from "@/components/proyectos/project-colors";

export function TaskCard({
  task,
  onEdit,
}: {
  task: TaskWithProject;
  onEdit: (task: Task) => void;
}) {
  const { run } = useRunAction();
  const done = task.status === "hecho";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-xs transition-colors hover:border-border/80">
      <div className="flex items-start gap-2">
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
          className="mt-0.5"
        />
        <p
          className={cn(
            "flex-1 text-sm leading-snug",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        <TaskActionsMenu task={task} onEdit={onEdit} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        {task.priority && <PriorityBadge priority={task.priority} />}
        {task.project && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs"
            style={{ color: projectColorValue(task.project.color) }}
          >
            {task.project.icon && <span aria-hidden>{task.project.icon}</span>}
            <span className="max-w-28 truncate">{task.project.name}</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pl-6">
        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
          {task.due_at ? (
            <>
              <span className={dueDateTone(task.due_at, done)}>{formatFecha(task.due_at)}</span>
              <span className={dueDateTone(task.due_at, done)}>
                {diasRestantesLabel(task.due_at)}
              </span>
            </>
          ) : (
            <span className={dueDateTone(null, done)}>sin fecha</span>
          )}
        </div>
        <UrgencyMeter
          priority={task.priority}
          dueAt={task.due_at}
          done={done}
        />
      </div>
    </div>
  );
}
