"use client";
// Kanban con columnas todo / en_progreso / hecho. Arrastrar entre columnas con
// dnd-kit -> moveTaskAction(id, status, position). UI OPTIMISTA: al soltar, el
// estado local se actualiza al instante y persiste en segundo plano; si falla,
// revierte al estado del servidor y avisa con la voz de la interfaz. El calculo
// se hace en onDragEnd sobre el estado estable (sin mover columnas en onDragOver)
// para evitar cierres obsoletos.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import type { Task, TaskStatus, TaskWithProject } from "@/types/db";
import { moveTaskAction, reorderTasksAction } from "@/lib/db/actions";
import { KanbanColumn } from "@/components/tareas/kanban-column";
import { PriorityBadge } from "@/components/tareas/priority-badge";
import { BOARD_STATUSES } from "@/components/tareas/task-constants";

type Columns = Record<TaskStatus, TaskWithProject[]>;

function groupByStatus(tasks: TaskWithProject[]): Columns {
  const cols: Columns = { inbox: [], todo: [], en_progreso: [], hecho: [] };
  for (const t of tasks) {
    if (t.status in cols) cols[t.status].push(t);
  }
  return cols;
}

function isColumnId(id: UniqueIdentifier): id is TaskStatus {
  return (BOARD_STATUSES as string[]).includes(id as string);
}

export function KanbanBoard({
  tasks,
  onEdit,
}: {
  tasks: TaskWithProject[];
  onEdit: (task: Task) => void;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>(() => groupByStatus(tasks));
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const startContainerRef = useRef<TaskStatus | null>(null);
  const draggingRef = useRef(false);

  // Reconciliar con el servidor cuando llegan datos nuevos (fuera del arrastre).
  useEffect(() => {
    if (draggingRef.current) return;
    setColumns(groupByStatus(tasks));
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function containerOf(id: UniqueIdentifier, cols: Columns): TaskStatus | undefined {
    if (isColumnId(id)) return id;
    return BOARD_STATUSES.find((status) => cols[status].some((t) => t.id === id));
  }

  const activeTask = activeId
    ? BOARD_STATUSES.map((s) => columns[s])
        .flat()
        .find((t) => t.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    draggingRef.current = true;
    setActiveId(event.active.id);
    startContainerRef.current = containerOf(event.active.id, columns) ?? null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    const startContainer = startContainerRef.current;
    startContainerRef.current = null;

    if (!over || !startContainer) {
      draggingRef.current = false;
      return;
    }

    const sourceContainer = containerOf(active.id, columns);
    const destContainer = isColumnId(over.id)
      ? over.id
      : containerOf(over.id, columns);
    if (!sourceContainer || !destContainer) {
      draggingRef.current = false;
      return;
    }

    let next: Columns;
    if (sourceContainer === destContainer) {
      const items = columns[sourceContainer];
      const oldIndex = items.findIndex((t) => t.id === active.id);
      const newIndex = isColumnId(over.id)
        ? items.length - 1
        : items.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        draggingRef.current = false;
        return;
      }
      next = {
        ...columns,
        [sourceContainer]: arrayMove(items, oldIndex, newIndex),
      };
    } else {
      const sourceItems = columns[sourceContainer];
      const destItems = columns[destContainer];
      const activeIndex = sourceItems.findIndex((t) => t.id === active.id);
      if (activeIndex === -1) {
        draggingRef.current = false;
        return;
      }
      const moved = sourceItems[activeIndex];
      const insertAt = isColumnId(over.id)
        ? destItems.length
        : Math.max(0, destItems.findIndex((t) => t.id === over.id));
      next = {
        ...columns,
        [sourceContainer]: sourceItems.filter((t) => t.id !== active.id),
        [destContainer]: [
          ...destItems.slice(0, insertAt),
          moved,
          ...destItems.slice(insertAt),
        ],
      };
    }

    setColumns(next);
    draggingRef.current = false;
    void persist(active.id as string, sourceContainer, destContainer, next);
  }

  async function persist(
    id: string,
    sourceContainer: TaskStatus,
    destContainer: TaskStatus,
    cols: Columns,
  ) {
    const destIds = cols[destContainer].map((t) => t.id);
    const destIndex = Math.max(0, destIds.indexOf(id));
    try {
      // Estado (+ completed_at) y posicion de la tarea movida.
      await moveTaskAction(id, destContainer, destIndex);
      // Normaliza posiciones de la columna destino.
      await reorderTasksAction(destIds);
      // Si cambio de columna, normaliza tambien el origen.
      if (sourceContainer !== destContainer) {
        await reorderTasksAction(cols[sourceContainer].map((t) => t.id));
      }
      router.refresh();
    } catch {
      toast.error("No se pudo mover la tarea. Vuelvo a como estaba.");
      setColumns(groupByStatus(tasks));
      router.refresh();
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        startContainerRef.current = null;
        draggingRef.current = false;
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BOARD_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status]}
            onEdit={onEdit}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5 shadow-lg">
            <p className="text-sm leading-snug">{activeTask.title}</p>
            {activeTask.priority && (
              <PriorityBadge priority={activeTask.priority} showLabel={false} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
