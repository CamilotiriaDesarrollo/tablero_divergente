"use client";
// Tareas repetitivas: las diarias (is_daily) y las semanales (weekly_days).
// Van juntas en un solo sitio porque responden a la misma pregunta: "que hago
// una y otra vez", pero se muestran distinto porque su naturaleza es distinta.
// Una diaria es la MISMA cada dia (no varia), asi que su lista plana con
// switch basta. Una semanal SI varia por dia (lunes si, sabado no) y se hace
// como sesiones (activar con cronometro, completar por dia), asi que usa el
// panel semanal de WeeklySessionsBoard en vez de una fila con checkbox.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Task, TaskWeeklyCompletion, TaskWithProject } from "@/types/db";
import { toggleDailyAction, completeTaskAction, reopenTaskAction } from "@/lib/db/actions";
import { formatFecha, diasRestantesLabel, dueDateTone } from "@/lib/utils/dates";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PriorityBadge } from "@/components/tareas/priority-badge";
import { UrgencyMeter } from "@/components/tareas/urgency-meter";
import { TaskActionsMenu } from "@/components/tareas/task-actions-menu";
import { WeeklySessionsBoard } from "@/components/tareas/weekly-sessions-board";
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

export function RepeatingTasks({
  dailyTasks,
  weeklyTasks,
  initialWeeklyCompletions,
  onEdit,
}: {
  dailyTasks: TaskWithProject[];
  weeklyTasks: TaskWithProject[];
  initialWeeklyCompletions: TaskWeeklyCompletion[];
  onEdit: (task: Task) => void;
}) {
  const [items, setItems] = useState<TaskWithProject[]>(dailyTasks);

  useEffect(() => {
    setItems(dailyTasks);
  }, [dailyTasks]);

  function removeItem(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  if (items.length === 0 && weeklyTasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">Sin tareas repetitivas</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Marca una tarea como diaria, o elige sus dias de la semana, para verla
          aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="flex items-baseline gap-2 text-sm font-medium">
          Diarias
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {items.length}
          </span>
        </h2>
        {items.length ? (
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
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            Ninguna tarea marcada como diaria.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-baseline gap-2 text-sm font-medium">
          Semanales
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {weeklyTasks.length}
          </span>
        </h2>
        <WeeklySessionsBoard
          weeklyTasks={weeklyTasks}
          initialCompletions={initialWeeklyCompletions}
          onEdit={onEdit}
        />
      </section>
    </div>
  );
}
