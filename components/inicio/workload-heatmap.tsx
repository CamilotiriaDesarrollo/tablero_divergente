"use client";
// Mapa de saturacion: un cuadrito por dia con las entregas pendientes.
//
// Con `collapsible` queda plegado y solo se ve su titulo, que ya adelanta si
// hay dias saturados. Asi acompana a una pantalla de trabajo (Tareas) sin robar
// altura: se abre cuando quieres mirar como vienes de carga y se vuelve a
// cerrar. En Inicio va siempre abierto, porque alli el panel ES el contenido.
import { useState } from "react";
import { ChevronRight } from "lucide-react";
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

export function WorkloadHeatmap({
  days,
  collapsible = false,
}: {
  days: WorkloadDay[];
  /** Plegado por defecto, con solo el titulo visible. */
  collapsible?: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState<WorkloadDay | null>(null);
  const [open, setOpen] = useState(!collapsible);
  const weekCount = Math.ceil(days.length / 7);
  const weekStarts = Array.from({ length: weekCount }, (_, index) => days[index * 7]);
  const saturados = days.filter(
    (day) => !day.isPast && day.count + day.highPriority >= 5,
  );
  const alerts = [...saturados]
    .sort(
      (a, b) =>
        b.count + b.highPriority - (a.count + a.highPriority) ||
        a.key.localeCompare(b.key),
    )
    .slice(0, 3);

  // El titulo plegado ya dice si vale la pena abrirlo.
  const resumen = saturados.length
    ? `${saturados.length} ${saturados.length === 1 ? "dia cargado" : "dias cargados"}`
    : "Sin dias saturados";

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
            />
            <h2 className="text-sm font-semibold">Alertas de actividad</h2>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Entregas pendientes por dia
            </span>
            <span
              className={cn(
                "ml-auto shrink-0 text-xs",
                saturados.length
                  ? "font-medium text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {resumen}
            </span>
          </button>
        ) : (
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Alertas de actividad</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Entregas pendientes por dia
              </p>
            </div>
            <span className="text-xs text-muted-foreground">4 meses</span>
          </div>
        )}

        {open ? (
          <>
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
                        <span className="truncate capitalize text-muted-foreground">
                          {day.label}
                        </span>
                        <span className="shrink-0 font-mono text-emerald-700 dark:text-emerald-400">
                          {day.count} tareas{day.highPriority ? ` / ${day.highPriority} altas` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
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
