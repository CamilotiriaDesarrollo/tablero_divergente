"use client";
// Columna del Kanban: zona soltable (dnd-kit) con su contexto ordenable. Recibe
// las tareas ya agrupadas por estado desde el tablero. Cuando sortMode/
// onSortModeChange llegan (solo para "Por hacer"), muestra un selector Manual /
// Por fecha; "En progreso" y "Finalizadas" no lo reciben y quedan sin cambios.
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Task, TaskStatus, TaskWithProject } from "@/types/db";
import { KanbanCard } from "@/components/tareas/kanban-card";
import {
  TASK_STATUS_LABEL,
  TODO_SORT_LABEL,
  type TodoSortMode,
} from "@/components/tareas/task-constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  status,
  tasks,
  onEdit,
  doingTaskIds,
  onToggleDoing,
  sortMode,
  onSortModeChange,
}: {
  status: TaskStatus;
  tasks: TaskWithProject[];
  onEdit: (task: Task) => void;
  doingTaskIds: string[];
  onToggleDoing: (taskId: string) => void;
  /** Presente solo en "Por hacer": activa el selector Manual / Por fecha. */
  sortMode?: TodoSortMode;
  onSortModeChange?: (mode: TodoSortMode) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const sortable = sortMode !== undefined && onSortModeChange !== undefined;

  return (
    <div className="flex min-w-0 flex-col rounded-xl bg-muted/40">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{TASK_STATUS_LABEL[status]}</h3>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        {sortable && (
          <Select
            value={sortMode}
            onValueChange={(value) => onSortModeChange(value as TodoSortMode)}
          >
            <SelectTrigger
              size="sm"
              className="h-6 gap-1 px-1.5 text-xs"
              aria-label="Ordenar Por hacer"
            >
              <SelectValue>
                {(value: string) => TODO_SORT_LABEL[value as TodoSortMode]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="manual">{TODO_SORT_LABEL.manual}</SelectItem>
              <SelectItem value="fecha">{TODO_SORT_LABEL.fecha}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      {sortable && sortMode === "fecha" && (
        <p className="-mt-1 px-3 pb-2 text-[11px] text-muted-foreground">
          Ordenada por fecha. Arrastra para mover a otra columna; cambia a
          Manual para reordenar aqui.
        </p>
      )}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-b-xl px-2 pb-2 transition-colors",
          isOver && "bg-accent/60",
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              isDoing={doingTaskIds.includes(task.id)}
              onToggleDoing={onToggleDoing}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground/70">
            Arrastra tareas aqui
          </p>
        )}
      </div>
    </div>
  );
}
