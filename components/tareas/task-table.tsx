"use client";
// Tabla estilo Notion. Columnas: titulo, proyecto, prioridad, fecha de entrega
// (mono), dias restantes (mono), medidor de urgencia y estado, con acciones por
// fila. Orden por defecto = MANUAL (el que llega, por position). "Ordenar por
// urgencia" es opt-in y NUNCA se activa solo (filosofia: los datos no deciden).
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { Task, TaskWithProject } from "@/types/db";
import {
  completeTaskAction,
  reopenTaskAction,
} from "@/lib/db/actions";
import { byUrgencyDesc } from "@/lib/utils/urgency";
import { formatFecha, diasRestantesLabel, estaVencida } from "@/lib/utils/dates";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/tareas/priority-badge";
import { UrgencyMeter } from "@/components/tareas/urgency-meter";
import { TaskActionsMenu } from "@/components/tareas/task-actions-menu";
import { TASK_STATUS_LABEL } from "@/components/tareas/task-constants";
import { useRunAction } from "@/components/tareas/use-run-action";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: Task["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 text-xs",
        status === "hecho"
          ? "border-border/60 text-muted-foreground"
          : "border-border bg-secondary text-secondary-foreground",
      )}
    >
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}

function TaskRow({
  task,
  onEdit,
}: {
  task: TaskWithProject;
  onEdit: (task: Task) => void;
}) {
  const { run } = useRunAction();
  const done = task.status === "hecho";
  const vencida = !done && estaVencida(task.due_at);

  return (
    <TableRow>
      <TableCell className="w-8">
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
      </TableCell>
      <TableCell className="max-w-[22rem] min-w-40 whitespace-normal">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className={cn(
            "text-left text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </button>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {task.project ? (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            {task.project.icon && <span aria-hidden>{task.project.icon}</span>}
            <span className="max-w-32 truncate">{task.project.name}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/60">Sin proyecto</span>
        )}
      </TableCell>
      <TableCell>
        <PriorityBadge priority={task.priority} showLabel={false} />
      </TableCell>
      <TableCell className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">
        {task.due_at ? formatFecha(task.due_at) : "·"}
      </TableCell>
      <TableCell
        className={cn(
          "hidden font-mono text-xs tabular-nums lg:table-cell",
          vencida ? "font-medium text-priority-alta" : "text-muted-foreground",
        )}
      >
        {task.due_at ? diasRestantesLabel(task.due_at) : "·"}
      </TableCell>
      <TableCell>
        <UrgencyMeter
          priority={task.priority}
          dueAt={task.due_at}
          done={done}
          showValue
        />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <StatusPill status={task.status} />
      </TableCell>
      <TableCell className="w-8 text-right">
        <TaskActionsMenu task={task} onEdit={onEdit} />
      </TableCell>
    </TableRow>
  );
}

export function TaskTable({
  tasks,
  onEdit,
}: {
  tasks: TaskWithProject[];
  onEdit: (task: Task) => void;
}) {
  const [sortByUrgency, setSortByUrgency] = useState(false);

  const rows = useMemo(() => {
    if (!sortByUrgency) return tasks;
    // Copia: no mutamos el orden manual que llega del servidor.
    return [...tasks].sort(byUrgencyDesc);
  }, [tasks, sortByUrgency]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">Aun no hay tareas en el tablero</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea la primera con el boton Nueva tarea.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {sortByUrgency
            ? "Ordenado por urgencia sugerida. Tu decides el orden real."
            : "Orden manual. La urgencia solo sugiere."}
        </p>
        <Button
          variant={sortByUrgency ? "secondary" : "outline"}
          size="sm"
          aria-pressed={sortByUrgency}
          onClick={() => setSortByUrgency((v) => !v)}
        >
          <ArrowUpDown />
          Ordenar por urgencia
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Titulo</TableHead>
              <TableHead className="hidden md:table-cell">Proyecto</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead className="hidden sm:table-cell">Entrega</TableHead>
              <TableHead className="hidden lg:table-cell">Restan</TableHead>
              <TableHead>Urgencia</TableHead>
              <TableHead className="hidden sm:table-cell">Estado</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((task) => (
              <TaskRow key={task.id} task={task} onEdit={onEdit} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
