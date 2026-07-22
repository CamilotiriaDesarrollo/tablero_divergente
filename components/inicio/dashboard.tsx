// components/inicio/dashboard.tsx
// Piezas de presentacion del tablero de Inicio (Server Components, render puro).
// Diseno: tranquilo y casi monocromatico; el color saturado se reserva para las
// prioridades (guardrail CLAUDE.md). El dato manda; la urgencia sugiere.
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { diasRestantesLabel, dueDateTone } from "@/lib/utils/dates";
import { PRIORITY_EMOJI, PRIORITY_LABEL } from "@/lib/utils/urgency";
import type { Priority, TaskWithProject } from "@/types/db";
import { TaskListPanel } from "@/components/inicio/task-list-panel";
import { projectColorValue } from "@/components/proyectos/project-colors";
export { WorkloadHeatmap } from "@/components/inicio/workload-heatmap";

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
  tasks: TaskWithProject[];
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
        <span
          className="hidden max-w-[8rem] truncate text-xs sm:inline"
          style={{ color: projectColorValue(task.project.color) }}
        >
          {task.project.name}
        </span>
      ) : null}
      <span
        className={cn(
          "shrink-0 font-mono text-xs tabular-nums",
          dueDateTone(task.due_at, task.status === "hecho"),
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
