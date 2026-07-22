"use client";
// Tareas diarias (is_daily). Cada fila alterna la marca de diaria con el switch
// (toggleDailyAction); al quitarla, desaparece de la lista al instante y se
// confirma en el servidor. Completar con la casilla; el resto en el menu.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Task, TaskWithProject } from "@/types/db";
import {
  toggleDailyAction,
  completeTaskAction,
  reopenTaskAction,
} from "@/lib/db/actions";
import { formatFecha, diasRestantesLabel, dueDateTone } from "@/lib/utils/dates";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PriorityBadge } from "@/components/tareas/priority-badge";
import { UrgencyMeter } from "@/components/tareas/urgency-meter";
import { TaskActionsMenu } from "@/components/tareas/task-actions-menu";
import { useRunAction } from "@/components/tareas/use-run-action";
import { cn } from "@/lib/utils";

function DailyRow({
  task,
  onEdit,
  onRemoved,
}: {
  task: TaskWithProject;
  onEdit: (task: Task) => void;
  onRemoved: (id: string) => void;
}) {
  const { run } = useRunAction();
  const router = useRouter();
  const done = task.status === "hecho";

  async function stopBeingDaily() {
    onRemoved(task.id);
    try {
      await toggleDailyAction(task.id, false);
      router.refresh();
    } catch {
      toast.error("No se pudo quitar de diarias. Intenta de nuevo.");
      router.refresh();
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
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
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className={cn(
            "truncate text-left text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </button>
        <div className="flex items-center gap-2">
          {task.priority && (
            <PriorityBadge priority={task.priority} showLabel={false} />
          )}
          {task.due_at && (
            <span
              className={cn(
                "font-mono text-xs tabular-nums",
                dueDateTone(task.due_at, done),
              )}
            >
              {formatFecha(task.due_at)} · {diasRestantesLabel(task.due_at)}
            </span>
          )}
        </div>
      </div>
      <UrgencyMeter priority={task.priority} dueAt={task.due_at} done={done} />
      <div className="flex items-center gap-2">
        <Label
          htmlFor={`daily-${task.id}`}
          className="hidden text-xs text-muted-foreground sm:block"
        >
          Diaria
        </Label>
        <Switch
          id={`daily-${task.id}`}
          checked
          onCheckedChange={() => void stopBeingDaily()}
          aria-label="Quitar de diarias"
        />
      </div>
      <TaskActionsMenu task={task} onEdit={onEdit} />
    </li>
  );
}

export function DailyTasks({
  tasks,
  onEdit,
}: {
  tasks: TaskWithProject[];
  onEdit: (task: Task) => void;
}) {
  const [items, setItems] = useState<TaskWithProject[]>(tasks);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  function removeItem(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">Sin tareas diarias</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Marca una tarea como diaria desde su menu para verla aqui cada dia.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((task) => (
        <DailyRow
          key={task.id}
          task={task}
          onEdit={onEdit}
          onRemoved={removeItem}
        />
      ))}
    </ul>
  );
}
