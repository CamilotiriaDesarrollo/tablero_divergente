"use client";
// components/calendario/calendar-day-cell.tsx
// Una celda de dia de la grilla del mes. Muestra hasta N tareas por due_at con
// un punto del color de su prioridad (el unico color saturado de la app) y el
// titulo truncado. El resto se despliega en un popover "+X mas". Un clic en el
// area vacia o en el numero del dia abre el dialog de creacion.
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Priority, TaskWithProject } from "@/types/db";
import { formatDayLong } from "./month-range";

const DOT_CLASS: Record<Priority, string> = {
  alta: "bg-priority-alta",
  media: "bg-priority-media",
  baja: "bg-priority-baja",
};

/** Chip compacto de una tarea. Reutilizado en la celda, el popover y la lista movil. */
export function TaskChip({
  task,
  onSelect,
  className,
}: {
  task: TaskWithProject;
  onSelect: (task: TaskWithProject) => void;
  className?: string;
}) {
  const done = task.status === "hecho";
  const dot = task.priority ? DOT_CLASS[task.priority] : "bg-muted-foreground/40";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(task);
      }}
      title={task.title}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent focus-visible:bg-accent",
        done && "opacity-70",
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dot, done && "opacity-50")}
        aria-hidden
      />
      <span className={cn("truncate", done && "text-muted-foreground line-through")}>
        {task.title}
      </span>
    </button>
  );
}

export function CalendarDayCell({
  date,
  tasks,
  isOutside,
  isToday,
  maxVisible,
  onCreateDay,
  onSelectTask,
}: {
  date: Date;
  tasks: TaskWithProject[];
  isOutside: boolean;
  isToday: boolean;
  maxVisible: number;
  onCreateDay: (date: Date) => void;
  onSelectTask: (task: TaskWithProject) => void;
}) {
  const visible = tasks.slice(0, maxVisible);
  const overflow = tasks.slice(maxVisible);
  const dayNumber = date.getDate();

  return (
    <div
      onClick={(e) => {
        // Solo el area vacia (no las tareas ni el "+X mas") crea tarea.
        if (e.target === e.currentTarget) onCreateDay(date);
      }}
      className={cn(
        "flex min-h-24 flex-col gap-1 p-1 sm:min-h-28",
        isOutside ? "bg-muted/30" : "bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onCreateDay(date)}
          aria-label={`Crear tarea el ${dayNumber}`}
          className={cn(
            "flex size-6 items-center justify-center rounded-full font-mono text-xs tabular-nums transition-colors hover:bg-accent hover:text-foreground",
            isToday && "font-semibold text-foreground ring-2 ring-ring",
            isOutside && !isToday && "text-muted-foreground/60",
          )}
        >
          {dayNumber}
        </button>
      </div>

      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onCreateDay(date);
        }}
        className="flex flex-1 flex-col gap-0.5"
      >
        {visible.map((task) => (
          <TaskChip key={task.id} task={task} onSelect={onSelectTask} />
        ))}

        {overflow.length > 0 && (
          <Popover>
            <PopoverTrigger
              className="mt-0.5 rounded-md px-1.5 py-0.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent"
            >
              +{overflow.length} mas
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60">
              <div className="text-xs font-medium text-muted-foreground">
                {formatDayLong(date)}
              </div>
              <div className="flex flex-col gap-0.5">
                {overflow.map((task) => (
                  <TaskChip key={task.id} task={task} onSelect={onSelectTask} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
