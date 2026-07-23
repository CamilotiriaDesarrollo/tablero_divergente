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
import { moveTaskOnBoardAction } from "@/lib/db/actions";
import { markLocalMutation } from "@/lib/realtime/echo-guard";
import { KanbanColumn } from "@/components/tareas/kanban-column";
import { PriorityBadge } from "@/components/tareas/priority-badge";
import {
  BOARD_STATUSES,
  type TodoSortMode,
} from "@/components/tareas/task-constants";

type Columns = Record<TaskStatus, TaskWithProject[]>;
const DOING_TASK_STORAGE_KEY = "tablero-divergente:doing-task";
const TODO_SORT_STORAGE_KEY = "tablero-divergente:todo-orden";

function groupByStatus(tasks: TaskWithProject[]): Columns {
  const cols: Columns = { inbox: [], todo: [], en_progreso: [], hecho: [] };
  for (const t of tasks) {
    if (t.status in cols) cols[t.status].push(t);
  }
  for (const status of BOARD_STATUSES) {
    // El tablero Proceso respeta el orden que la persona arma al arrastrar.
    cols[status].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  }
  return cols;
}

/**
 * Orden por fecha de entrega para "Por hacer": vencidas y hoy primero, luego lo
 * mas cercano; sin fecha al final. Solo para MOSTRAR, no toca el orden manual
 * guardado (position) para poder volver a "Manual" sin perder nada.
 */
function sortTodoByDueDate(tasks: TaskWithProject[]): TaskWithProject[] {
  return [...tasks].sort((a, b) => {
    if (a.due_at && b.due_at) {
      return a.due_at.localeCompare(b.due_at) || a.position - b.position;
    }
    if (a.due_at) return -1;
    if (b.due_at) return 1;
    return a.position - b.position;
  });
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
  const [doingTaskId, setDoingTaskId] = useState<string | null>(null);
  const [todoSort, setTodoSort] = useState<TodoSortMode>("manual");
  const startContainerRef = useRef<TaskStatus | null>(null);
  const draggingRef = useRef(false);

  // Reconciliar con el servidor cuando llegan datos nuevos (fuera del arrastre).
  useEffect(() => {
    if (draggingRef.current) return;
    setColumns(groupByStatus(tasks));
  }, [tasks]);

  useEffect(() => {
    setDoingTaskId(window.localStorage.getItem(DOING_TASK_STORAGE_KEY));
    const savedSort = window.localStorage.getItem(TODO_SORT_STORAGE_KEY);
    if (savedSort === "manual" || savedSort === "fecha") setTodoSort(savedSort);
  }, []);

  useEffect(() => {
    if (!doingTaskId) return;
    const activeTask = tasks.find((task) => task.id === doingTaskId);
    if (activeTask?.status === "en_progreso") {
      window.localStorage.setItem(DOING_TASK_STORAGE_KEY, doingTaskId);
      return;
    }
    window.localStorage.removeItem(DOING_TASK_STORAGE_KEY);
    setDoingTaskId(null);
  }, [doingTaskId, tasks]);

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

    // "Por hacer" ordenada por fecha: el orden lo decide la fecha, no el
    // arrastre. Reordenar DENTRO de esta columna no tiene efecto (vuelve
    // "Manual" para reordenar a mano); mover HACIA otra columna si funciona.
    // "En progreso" y "Finalizadas" son independientes: nunca entran aqui.
    if (
      sourceContainer === destContainer &&
      sourceContainer === "todo" &&
      todoSort === "fecha"
    ) {
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
    markLocalMutation(); // suprime el eco de Realtime de esta mutacion
    try {
      // Una sola accion: estado (+ completed_at) y posicion de la movida, orden
      // de la columna destino y, si cambio de columna, orden del origen.
      await moveTaskOnBoardAction({
        id,
        status: destContainer,
        destIds,
        sourceIds:
          sourceContainer !== destContainer
            ? cols[sourceContainer].map((t) => t.id)
            : undefined,
      });
      markLocalMutation();
      // Reconciliacion con las posiciones/estado normalizados del servidor.
      router.refresh();
    } catch {
      toast.error("No se pudo mover la tarea. Vuelvo a como estaba.");
      setColumns(groupByStatus(tasks));
      router.refresh();
    }
  }

  function toggleDoing(taskId: string) {
    setDoingTaskId((current) => {
      const next = current === taskId ? null : taskId;
      if (next) window.localStorage.setItem(DOING_TASK_STORAGE_KEY, next);
      else window.localStorage.removeItem(DOING_TASK_STORAGE_KEY);
      return next;
    });
  }

  function changeTodoSort(next: TodoSortMode) {
    setTodoSort(next);
    window.localStorage.setItem(TODO_SORT_STORAGE_KEY, next);
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
            tasks={
              status === "todo" && todoSort === "fecha"
                ? sortTodoByDueDate(columns.todo)
                : columns[status]
            }
            onEdit={onEdit}
            doingTaskId={doingTaskId}
            onToggleDoing={toggleDoing}
            sortMode={status === "todo" ? todoSort : undefined}
            onSortModeChange={status === "todo" ? changeTodoSort : undefined}
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
