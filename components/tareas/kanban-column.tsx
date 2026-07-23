"use client";
// Columna del Kanban: zona soltable (dnd-kit) con su contexto ordenable. Recibe
// las tareas ya agrupadas por estado desde el tablero.
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Task, TaskStatus, TaskWithProject } from "@/types/db";
import { KanbanCard } from "@/components/tareas/kanban-card";
import { TASK_STATUS_LABEL } from "@/components/tareas/task-constants";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  status,
  tasks,
  onEdit,
  doingTaskId,
  onToggleDoing,
}: {
  status: TaskStatus;
  tasks: TaskWithProject[];
  onEdit: (task: Task) => void;
  doingTaskId: string | null;
  onToggleDoing: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-0 flex-col rounded-xl bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-sm font-medium">{TASK_STATUS_LABEL[status]}</h3>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </div>
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
              isDoing={task.id === doingTaskId}
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
