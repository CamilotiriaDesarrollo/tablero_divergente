"use client";
// Tabla estilo Notion. Columnas: titulo, proyecto, prioridad, fecha de entrega
// (mono), dias restantes (mono), medidor de urgencia y estado, con acciones por
// fila. Orden por defecto = MANUAL (el que llega, por position). Cada encabezado
// permite ordenar ascendente, descendente y volver al orden manual.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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
import { PriorityBadge } from "@/components/tareas/priority-badge";
import { UrgencyMeter } from "@/components/tareas/urgency-meter";
import { TaskActionsMenu } from "@/components/tareas/task-actions-menu";
import { TASK_STATUS_LABEL } from "@/components/tareas/task-constants";
import { useRunAction } from "@/components/tareas/use-run-action";
import { cn } from "@/lib/utils";

type SortKey = "title" | "project" | "priority" | "due_at" | "urgency" | "status";
type SortDirection = "asc" | "desc";
type Sort = { key: SortKey; direction: SortDirection } | null;

const PRIORITY_ORDER = { baja: 1, media: 2, alta: 3 } as const;
const STATUS_ORDER = { inbox: 1, todo: 2, en_progreso: 3, hecho: 4 } as const;
const SORT_LABEL: Record<SortKey, string> = {
  title: "titulo",
  project: "proyecto",
  priority: "prioridad",
  due_at: "entrega",
  urgency: "urgencia",
  status: "estado",
};

function compareText(a: string, b: string) {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

function sortLabel(key: SortKey) {
  return SORT_LABEL[key];
}

function compareDate(a: string | null, b: string | null) {
  if (!a) return b ? 1 : 0;
  if (!b) return -1;
  return a.localeCompare(b);
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const direction = active ? sort.direction : undefined;
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <TableHead
      className={className}
      aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-left font-medium transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {label}
        <Icon
          className={cn("size-3.5", active ? "text-foreground" : "text-muted-foreground/70")}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

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
  const [sort, setSort] = useState<Sort>(null);

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  const rows = useMemo(() => {
    let ordered = tasks;

    if (sort) {
      const compare = (a: TaskWithProject, b: TaskWithProject) => {
        switch (sort.key) {
          case "title":
            return compareText(a.title, b.title);
          case "project":
            return compareText(a.project?.name ?? "\uffff", b.project?.name ?? "\uffff");
          case "priority":
            return (PRIORITY_ORDER[a.priority ?? "baja"] ?? 0) - (PRIORITY_ORDER[b.priority ?? "baja"] ?? 0);
          case "due_at":
            return compareDate(a.due_at, b.due_at);
          case "urgency":
            return byUrgencyDesc(b, a);
          case "status":
            return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        }
      };

      ordered = [...tasks].sort((a, b) => {
        const result = compare(a, b);
        return sort.direction === "asc" ? result : -result;
      });
    }

    // Las tareas terminadas quedan visibles para consulta, pero nunca se mezclan
    // con el trabajo que aun requiere atencion.
    return [
      ...ordered.filter((task) => task.status !== "hecho"),
      ...ordered.filter((task) => task.status === "hecho"),
    ];
  }, [tasks, sort]);

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
          {sort
            ? `Ordenado por ${sortLabel(sort.key)} (${sort.direction === "asc" ? "ascendente" : "descendente"}).`
            : "Orden manual. Las tareas finalizadas quedan al final."}
        </p>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <SortableHead label="Titulo" sortKey="title" sort={sort} onSort={toggleSort} />
              <SortableHead label="Proyecto" sortKey="project" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortableHead label="Prioridad" sortKey="priority" sort={sort} onSort={toggleSort} />
              <SortableHead label="Entrega" sortKey="due_at" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortableHead label="Restan" sortKey="due_at" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortableHead label="Urgencia" sortKey="urgency" sort={sort} onSort={toggleSort} />
              <SortableHead label="Estado" sortKey="status" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
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
