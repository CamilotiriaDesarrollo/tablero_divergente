"use client";
// Vista por tiempo (BLUEPRINT seccion 4/6): columnas Vencido / Hoy / 1-14 /
// 15-30 / 30+ / Sin fecha, agrupadas por due_at con timeBucket. Tarjetas
// compactas. Es lectura por proximidad; no reordena nada por su cuenta.
import { useMemo } from "react";
import type { Task, TaskWithProject } from "@/types/db";
import {
  timeBucket,
  TIME_BUCKET_ORDER,
  TIME_BUCKET_LABELS,
  type TimeBucket,
} from "@/lib/utils/dates";
import { TaskCard } from "@/components/tareas/task-card";
import { cn } from "@/lib/utils";

export function TimeBucketsBoard({
  tasks,
  onEdit,
}: {
  tasks: TaskWithProject[];
  onEdit: (task: Task) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<TimeBucket, TaskWithProject[]> = {
      vencido: [],
      hoy: [],
      dias_1_14: [],
      dias_15_30: [],
      dias_30_mas: [],
      sin_fecha: [],
    };
    for (const t of tasks) map[timeBucket(t.due_at)].push(t);
    return map;
  }, [tasks]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {TIME_BUCKET_ORDER.map((bucket) => {
        const items = grouped[bucket];
        return (
          <section
            key={bucket}
            className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/40"
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <h3
                className={cn(
                  "text-sm font-medium",
                  bucket === "vencido" && items.length > 0 && "text-priority-alta",
                )}
              >
                {TIME_BUCKET_LABELS[bucket]}
              </h3>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
              {items.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEdit} />
              ))}
              {items.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground/70">
                  Nada aqui
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
