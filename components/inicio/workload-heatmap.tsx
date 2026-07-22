"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TaskListDialog } from "@/components/inicio/task-list-panel";
import type { WorkloadDay } from "@/components/inicio/dashboard";

function workloadTone(day: WorkloadDay): string {
  if (day.isPast) return "bg-muted/35";
  const score = day.count + day.highPriority;
  if (score >= 5) return "bg-emerald-700 dark:bg-emerald-500";
  if (score === 4) return "bg-emerald-600 dark:bg-emerald-500";
  if (score === 3) return "bg-emerald-500 dark:bg-emerald-600";
  if (score === 2) return "bg-emerald-400 dark:bg-emerald-700";
  if (score === 1) return "bg-emerald-200 dark:bg-emerald-900";
  return "bg-muted/70";
}

export function WorkloadHeatmap({ days }: { days: WorkloadDay[] }) {
  const [selectedDay, setSelectedDay] = useState<WorkloadDay | null>(null);
  const weekCount = Math.ceil(days.length / 7);
  const weekStarts = Array.from({ length: weekCount }, (_, index) => days[index * 7]);
  const alerts = days
    .filter((day) => !day.isPast && day.count + day.highPriority >= 5)
    .sort(
      (a, b) =>
        b.count + b.highPriority - (a.count + a.highPriority) ||
        a.key.localeCompare(b.key),
    )
    .slice(0, 3);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Alertas de actividad</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Entregas pendientes por dia
            </p>
          </div>
          <span className="text-xs text-muted-foreground">4 meses</span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="w-max">
            <div
              className="ml-6 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${weekCount}, 0.875rem)` }}
            >
              {weekStarts.map((day, index) => {
                const previous = index > 0 ? weekStarts[index - 1]?.month : null;
                return (
                  <span
                    key={day.key}
                    className="h-3 text-[9px] leading-3 text-muted-foreground capitalize"
                  >
                    {index === 0 || day.month !== previous ? day.month : ""}
                  </span>
                );
              })}
            </div>
            <div className="mt-1 flex gap-1.5">
              <div className="grid w-4 shrink-0 grid-rows-7 gap-1 text-[9px] text-muted-foreground">
                {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                  <span key={`${label}-${index}`} className="flex size-3 items-center">
                    {label}
                  </span>
                ))}
              </div>
              <div
                className="grid grid-flow-col grid-rows-7 gap-1"
                style={{ gridTemplateColumns: `repeat(${weekCount}, 0.875rem)` }}
              >
                {days.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    title={`${day.label}: ${day.count} pendientes${day.highPriority ? `, ${day.highPriority} de prioridad alta` : ""}`}
                    aria-label={`Ver tareas del ${day.label}: ${day.count} pendientes`}
                    className={cn(
                      "size-3.5 rounded-[2px] ring-1 ring-black/5 transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
                      workloadTone(day),
                      day.isToday && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-card",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          <span>Menos carga</span>
          <span className="size-3 rounded-[2px] bg-muted/70" />
          <span className="size-3 rounded-[2px] bg-emerald-200 dark:bg-emerald-900" />
          <span className="size-3 rounded-[2px] bg-emerald-400 dark:bg-emerald-700" />
          <span className="size-3 rounded-[2px] bg-emerald-500 dark:bg-emerald-600" />
          <span className="size-3 rounded-[2px] bg-emerald-700 dark:bg-emerald-500" />
          <span>Mayor carga</span>
        </div>

        {alerts.length ? (
          <div className="border-t pt-2">
            <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Dias con mayor concentracion
            </p>
            <ul className="space-y-1">
              {alerts.map((day) => (
                <li key={day.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className="flex w-full items-center justify-between gap-3 rounded px-1 py-0.5 text-left text-xs hover:bg-muted"
                  >
                    <span className="truncate capitalize text-muted-foreground">{day.label}</span>
                    <span className="shrink-0 font-mono text-emerald-700 dark:text-emerald-400">
                      {day.count} tareas{day.highPriority ? ` / ${day.highPriority} altas` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <TaskListDialog
        title={selectedDay ? `Tareas del ${selectedDay.label}` : "Tareas del dia"}
        tasks={selectedDay?.tasks ?? []}
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
      />
    </>
  );
}
