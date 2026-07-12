// app/(app)/page.tsx
// Inicio / Foco: lo vencido, lo de hoy, lo proximo, y captura rapida.
// Lectura de urgencia como senal (emoji + dias). Nunca reordena solo.
import Link from "next/link";
import { addDays } from "date-fns";
import { AlertTriangle, CalendarClock, Sun } from "lucide-react";
import { getOverdueTasks, getTodayTasks, getTasksInRange } from "@/lib/db/tasks";
import type { TaskWithProject } from "@/types/db";
import { isSupabaseConfigured } from "@/lib/config";
import { diasRestantesLabel } from "@/lib/utils/dates";
import { PRIORITY_EMOJI } from "@/lib/utils/urgency";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { InicioQuickCapture } from "@/components/shared/inicio-quick-capture";

export const dynamic = "force-dynamic";

function TaskRow({ task }: { task: TaskWithProject }) {
  return (
    <Link
      href="/tareas"
      className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-primary/40"
    >
      <span className="w-5 text-center text-sm" aria-hidden>
        {task.priority ? PRIORITY_EMOJI[task.priority] : "·"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {task.title}
      </span>
      {task.project?.name && (
        <span className="hidden truncate text-xs text-muted-foreground sm:inline">
          {task.project.name}
        </span>
      )}
      <span
        className={cn(
          "shrink-0 font-mono text-xs",
          task.due_at ? "text-muted-foreground" : "text-muted-foreground/60",
        )}
      >
        {diasRestantesLabel(task.due_at)}
      </span>
    </Link>
  );
}

function Section({
  title,
  icon,
  tone,
  tasks,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  tone?: "danger" | "accent";
  tasks: TaskWithProject[];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 font-heading text-sm font-semibold tracking-tight">
        <span
          className={cn(
            tone === "danger" && "text-priority-alta",
            tone === "accent" && "text-primary",
          )}
        >
          {icon}
        </span>
        {title}
        <span className="font-mono text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </h2>
      {tasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function InicioPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Casi listo"
          description="Agrega tus llaves de Supabase en .env.local para conectar tus datos. Mientras tanto puedes recorrer la interfaz."
        />
      </div>
    );
  }

  let overdue: TaskWithProject[] = [];
  let today: TaskWithProject[] = [];
  let upcoming: TaskWithProject[] = [];
  let failed = false;

  try {
    const now = new Date();
    [overdue, today, upcoming] = await Promise.all([
      getOverdueTasks(),
      getTodayTasks(),
      getTasksInRange(addDays(now, 1), addDays(now, 14)),
    ]);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="No pudimos cargar tu foco"
          description="Revisa que las migraciones esten aplicadas en Supabase y recarga la pagina."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Inicio
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo que importa hoy. El orden lo decides tu.
        </p>
      </header>

      <InicioQuickCapture />

      <div className="space-y-8">
        <Section
          title="Vencido"
          tone="danger"
          icon={<AlertTriangle className="size-4" />}
          tasks={overdue}
          emptyLabel="Nada vencido. Bien ahi."
        />
        <Section
          title="Hoy"
          tone="accent"
          icon={<Sun className="size-4" />}
          tasks={today}
          emptyLabel="Sin tareas para hoy. Puedes capturar algo arriba."
        />
        <Section
          title="Proximo (14 dias)"
          icon={<CalendarClock className="size-4" />}
          tasks={upcoming}
          emptyLabel="Nada en el horizonte cercano."
        />
      </div>
    </div>
  );
}
