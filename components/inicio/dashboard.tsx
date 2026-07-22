// components/inicio/dashboard.tsx
// Piezas de presentacion del tablero de Inicio (Server Components, render puro).
// Diseno: tranquilo y casi monocromatico; el color saturado se reserva para las
// prioridades (guardrail CLAUDE.md). El dato manda; la urgencia sugiere.
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { diasRestantesLabel } from "@/lib/utils/dates";
import { PRIORITY_EMOJI, PRIORITY_LABEL } from "@/lib/utils/urgency";
import type { Priority, TaskWithProject } from "@/types/db";
import { TaskListPanel } from "@/components/inicio/task-list-panel";
import { projectColorValue } from "@/components/proyectos/project-colors";

// ---------- Tarjeta de indicador (KPI) ----------

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  children,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "danger" | "accent" | "positive";
  children?: React.ReactNode;
}) {
  const toneText =
    tone === "danger"
      ? "text-priority-alta"
      : tone === "accent"
        ? "text-primary"
        : tone === "positive"
          ? "text-emerald-500 dark:text-emerald-400"
          : "text-foreground";

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <Icon className={cn("size-4 shrink-0", toneText)} aria-hidden />
      </div>
      <div className="flex items-end justify-between gap-2">
        <span
          className={cn(
            "font-heading text-3xl leading-none font-semibold tabular-nums",
            toneText,
          )}
        >
          {value}
        </span>
        {children}
      </div>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

// ---------- Actividad: barras de tareas completadas por dia ----------

export interface DaySlot {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
}

export function WeeklyActivity({
  series,
  total,
}: {
  series: DaySlot[];
  total: number;
}) {
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Actividad</h2>
        <span className="text-xs text-muted-foreground">
          {total} realizadas · 7 dias
        </span>
      </div>
      <div className="flex h-24 items-end justify-between gap-1.5">
        {series.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-sm transition-all",
                  d.isToday ? "bg-primary" : "bg-foreground/15",
                )}
                style={{
                  height: `${Math.max(d.count ? 8 : 3, (d.count / max) * 100)}%`,
                }}
                title={`${d.count} realizadas`}
              />
            </div>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                d.isToday ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {d.count}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Carga futura: matriz de tareas pendientes por dia ----------

export interface WorkloadDay {
  key: string;
  label: string;
  count: number;
  highPriority: number;
  isToday: boolean;
  isPast: boolean;
  month: string;
}

function workloadTone(day: WorkloadDay): string {
  if (day.isPast) return "bg-muted/30";
  const score = day.count + day.highPriority;
  if (score >= 5) return "bg-red-500";
  if (score === 4) return "bg-amber-400 dark:bg-amber-500";
  if (score === 3) return "bg-emerald-600 dark:bg-emerald-500";
  if (score === 2) return "bg-emerald-400 dark:bg-emerald-600";
  if (score === 1) return "bg-emerald-200 dark:bg-emerald-900";
  return "bg-muted/70";
}

export function WorkloadHeatmap({ days }: { days: WorkloadDay[] }) {
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
    <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Alertas de actividad</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Carga de entregas pendientes por dia
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Proximos 4 meses</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[30rem]">
          <div
            className="ml-7 grid gap-1"
            style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}
          >
            {weekStarts.map((day, index) => {
              const previous = index > 0 ? weekStarts[index - 1]?.month : null;
              return (
                <span
                  key={day.key}
                  className="h-4 text-[10px] text-muted-foreground capitalize"
                >
                  {index === 0 || day.month !== previous ? day.month : ""}
                </span>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1.5">
            <div className="grid w-5 shrink-0 grid-rows-7 gap-1 text-[9px] text-muted-foreground">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => (
                <span key={`${label}-${index}`} className="flex items-center">
                  {label}
                </span>
              ))}
            </div>
            <div
              className="grid flex-1 grid-flow-col grid-rows-7 gap-1"
              style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}
            >
              {days.map((day) => (
                <span
                  key={day.key}
                  title={`${day.label}: ${day.count} pendientes${day.highPriority ? `, ${day.highPriority} de prioridad alta` : ""}`}
                  className={cn(
                    "aspect-square min-h-3 rounded-[2px] ring-1 ring-black/5",
                    workloadTone(day),
                    day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>Menos carga</span>
          <span className="size-3 rounded-[2px] bg-muted/70" />
          <span className="size-3 rounded-[2px] bg-emerald-200 dark:bg-emerald-900" />
          <span className="size-3 rounded-[2px] bg-emerald-400 dark:bg-emerald-600" />
          <span className="size-3 rounded-[2px] bg-emerald-600 dark:bg-emerald-500" />
          <span className="size-3 rounded-[2px] bg-amber-400 dark:bg-amber-500" />
          <span className="size-3 rounded-[2px] bg-red-500" />
          <span>Mas carga</span>
        </div>
        <span>Prioridad alta aumenta la alerta</span>
      </div>

      <div className="border-t pt-3">
        {alerts.length ? (
          <ul className="space-y-1.5">
            {alerts.map((day) => (
              <li key={day.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate capitalize text-muted-foreground">{day.label}</span>
                <span className="shrink-0 font-mono text-red-500">
                  {day.count} tareas{day.highPriority ? ` / ${day.highPriority} altas` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No hay dias con carga critica en este horizonte.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- Distribucion por prioridad (barra apilada) ----------

const PRIORITY_BAR: Record<Priority, string> = {
  alta: "bg-priority-alta",
  media: "bg-priority-media",
  baja: "bg-priority-baja",
};

export function PriorityBreakdown({
  counts,
  total,
}: {
  counts: { alta: number; media: number; baja: number; ninguna: number };
  total: number;
}) {
  const rows: { key: Priority | "ninguna"; label: string; value: number }[] = [
    { key: "alta", label: `${PRIORITY_EMOJI.alta} ${PRIORITY_LABEL.alta}`, value: counts.alta },
    { key: "media", label: `${PRIORITY_EMOJI.media} ${PRIORITY_LABEL.media}`, value: counts.media },
    { key: "baja", label: `${PRIORITY_EMOJI.baja} ${PRIORITY_LABEL.baja}`, value: counts.baja },
    { key: "ninguna", label: "Sin prioridad", value: counts.ninguna },
  ];
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Prioridad</h2>
        <span className="text-xs text-muted-foreground">{total} pendientes</span>
      </div>
      {/* Barra apilada */}
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {(["alta", "media", "baja"] as Priority[]).map((p) =>
          counts[p] > 0 ? (
            <div
              key={p}
              className={PRIORITY_BAR[p]}
              style={{ width: `${(counts[p] / Math.max(1, total)) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-mono tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Trabajo abierto por proyecto ----------

export interface ProjectSlot {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
  open: number;
  done: number;
  overdue: number;
}

export function ProjectBreakdown({ rows }: { rows: ProjectSlot[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Por proyecto</h2>
        <Link
          href="/proyectos"
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Ver todos
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No hay tareas abiertas en tus proyectos.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="border-l-2 px-3 py-2"
              style={{
                borderColor: projectColorValue(r.color),
                backgroundColor: `${projectColorValue(r.color)}14`,
              }}
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span aria-hidden>{r.icon ?? "•"}</span>
                  <span className="truncate">{r.name}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {Math.round((r.done / Math.max(1, r.total)) * 100)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(r.done / Math.max(1, r.total)) * 100}%`,
                    backgroundColor: projectColorValue(r.color),
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{r.open} pendientes</span>
                <span>{r.done} finalizadas</span>
                {r.overdue > 0 ? (
                  <span className="text-priority-alta">{r.overdue} vencidas</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Listas de foco (Vencido / Hoy / Proximo) ----------

export function FocusRow({ task }: { task: TaskWithProject }) {
  return (
    <Link
      href="/tareas"
      className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
    >
      <span className="w-4 text-center text-sm" aria-hidden>
        {task.priority ? PRIORITY_EMOJI[task.priority] : "·"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
      {task.project?.name ? (
        <span className="hidden max-w-[8rem] truncate text-xs text-muted-foreground sm:inline">
          {task.project.name}
        </span>
      ) : null}
      <span
        className={cn(
          "shrink-0 font-mono text-xs tabular-nums",
          task.due_at ? "text-muted-foreground" : "text-muted-foreground/50",
        )}
      >
        {diasRestantesLabel(task.due_at)}
      </span>
    </Link>
  );
}

export function FocusSection({
  title,
  icon: Icon,
  tone,
  tasks,
  emptyLabel,
  limit = 6,
}: {
  title: string;
  icon: LucideIcon;
  tone?: "danger" | "accent";
  tasks: TaskWithProject[];
  emptyLabel: string;
  limit?: number;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Icon
          className={cn(
            "size-4",
            tone === "danger" && "text-priority-alta",
            tone === "accent" && "text-primary",
            !tone && "text-muted-foreground",
          )}
          aria-hidden
        />
        {title}
        <span className="font-mono text-xs font-normal text-muted-foreground">
          {tasks.length}
        </span>
      </h2>
      <TaskListPanel title={title} tasks={tasks} emptyLabel={emptyLabel} limit={limit} />
    </section>
  );
}
