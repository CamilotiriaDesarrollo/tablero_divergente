// app/(app)/page.tsx
// Inicio: tablero de productividad. Indicadores (pendientes, vencidas, hoy,
// realizadas), actividad de la semana, distribucion por prioridad, trabajo por
// proyecto y listas de foco (vencido / hoy / proximo). La urgencia sugiere, el
// orden lo decide la persona (BLUEPRINT / CLAUDE.md). Sin em-dashes en la copy.
import { addDays, subDays, startOfDay, startOfWeek, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Sun,
} from "lucide-react";
import { getAllBoardTasks, getOpenTasks, getCompletedSince } from "@/lib/db/tasks";
import type { Priority, TaskWithProject } from "@/types/db";
import { isSupabaseConfigured } from "@/lib/config";
import {
  toDateColumn,
  diasRestantes,
  esHoy,
  estaVencida,
} from "@/lib/utils/dates";
import { EmptyState } from "@/components/shared/empty-state";
import { InicioQuickCapture } from "@/components/shared/inicio-quick-capture";
import {
  StatCard,
  WorkloadHeatmap,
  PriorityBreakdown,
  ProjectBreakdown,
  FocusSection,
  type WorkloadDay,
  type ProjectSlot,
} from "@/components/inicio/dashboard";
import { TaskListDialogButton } from "@/components/inicio/task-list-panel";

export const dynamic = "force-dynamic";

function byDueAsc(a: TaskWithProject, b: TaskWithProject): number {
  return (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999");
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

  const now = new Date();
  const todayStr = toDateColumn(now);
  const weekStart = startOfDay(subDays(now, 6)); // ventana de 7 dias (incluye hoy)

  let openTasks: TaskWithProject[] = [];
  let completed: TaskWithProject[] = [];
  let allBoardTasks: TaskWithProject[] = [];
  let failed = false;
  try {
    [openTasks, completed, allBoardTasks] = await Promise.all([
      getOpenTasks(), // todo + en_progreso, nivel superior, con proyecto
      getCompletedSince(weekStart.toISOString()),
      getAllBoardTasks(),
    ]);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="No pudimos cargar tu tablero"
          description="Revisa que las migraciones esten aplicadas en Supabase y recarga la pagina."
        />
      </div>
    );
  }

  // --- Foco por fecha ---
  const overdue = openTasks.filter((t) => estaVencida(t.due_at)).sort(byDueAsc);
  const today = openTasks.filter((t) => esHoy(t.due_at)).sort(byDueAsc);
  const nextThreeDays = openTasks
    .filter((t) => {
      const d = diasRestantes(t.due_at);
      return d !== null && d >= 1 && d <= 3;
    })
    .sort(byDueAsc);
  const nextWeek = openTasks
    .filter((t) => {
      const d = diasRestantes(t.due_at);
      return d !== null && d >= 4 && d <= 10;
    })
    .sort(byDueAsc);

  // --- Indicadores ---
  const pendientes = openTasks.length;
  const enProgreso = openTasks.filter((t) => t.status === "en_progreso").length;

  const prio = { alta: 0, media: 0, baja: 0, ninguna: 0 };
  for (const t of openTasks) {
    prio[(t.priority ?? "ninguna") as Priority | "ninguna"] += 1;
  }

  const completedWeek = completed.length;
  const completedTasks = allBoardTasks
    .filter((task) => task.status === "hecho")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const dayOf = (iso: string | null) =>
    iso ? toDateColumn(parseISO(iso)) : "";
  const completedToday = completed.filter(
    (t) => dayOf(t.completed_at) === todayStr,
  ).length;

  const dueByDay = new Map<string, TaskWithProject[]>();
  for (const task of openTasks) {
    if (!task.due_at) continue;
    const key = toDateColumn(parseISO(task.due_at));
    dueByDay.set(key, [...(dueByDay.get(key) ?? []), task]);
  }
  const heatmapStart = startOfWeek(now, { weekStartsOn: 1 });
  const heatmapDays: WorkloadDay[] = Array.from({ length: 16 * 7 }, (_, index) => {
    const date = addDays(heatmapStart, index);
    const key = toDateColumn(date);
    const tasks = dueByDay.get(key) ?? [];
    return {
      key,
      label: format(date, "EEEE d 'de' MMMM", { locale: es }),
      month: format(date, "MMM", { locale: es }),
      count: tasks.length,
      highPriority: tasks.filter((task) => task.priority === "alta").length,
      isToday: key === todayStr,
      isPast: key < todayStr,
    };
  });

  // --- Avance por proyecto (incluye "Sin proyecto") ---
  const projMap = new Map<string, ProjectSlot>();
  for (const t of allBoardTasks) {
    const id = t.project?.id ?? "__none__";
    const cur =
      projMap.get(id) ??
      ({
        id,
        name: t.project?.name ?? "Sin proyecto",
        icon: t.project?.icon ?? null,
        color: t.project?.color ?? null,
        total: 0,
        open: 0,
        done: 0,
        overdue: 0,
      } as ProjectSlot);
    cur.total += 1;
    if (t.status === "hecho") cur.done += 1;
    else {
      cur.open += 1;
      if (estaVencida(t.due_at)) cur.overdue += 1;
    }
    projMap.set(id, cur);
  }
  const projectRows = [...projMap.values()]
    .sort((a, b) => b.open - a.open || b.overdue - a.overdue)
    .slice(0, 6);

  // --- Saludo ---
  const hour = now.getHours();
  const saludo =
    hour < 12 ? "Buenos dias" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const fecha = format(now, "EEEE d 'de' MMMM", { locale: es });

  const resumen =
    overdue.length > 0
      ? `Tienes ${overdue.length} ${overdue.length === 1 ? "tarea vencida" : "tareas vencidas"} y ${pendientes} pendientes en total.`
      : pendientes > 0
        ? `${pendientes} ${pendientes === 1 ? "tarea pendiente" : "tareas pendientes"}. Nada vencido, vas al dia.`
        : "Todo al dia. No tienes pendientes abiertos.";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {saludo}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="capitalize">{fecha}</span>. {resumen}
        </p>
      </header>

      <InicioQuickCapture />

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pendientes"
          value={pendientes}
          icon={ListTodo}
          hint={`${enProgreso} en progreso`}
        >
          <TaskListDialogButton title="Tareas pendientes" tasks={openTasks} />
        </StatCard>
        <StatCard
          label="Vencidas"
          value={overdue.length}
          icon={AlertTriangle}
          tone={overdue.length ? "danger" : "neutral"}
          hint={overdue.length ? "requieren atencion" : "nada vencido"}
        >
          <TaskListDialogButton title="Tareas vencidas" tasks={overdue} />
        </StatCard>
        <StatCard
          label="Para hoy"
          value={today.length}
          icon={Sun}
          tone={today.length ? "accent" : "neutral"}
          hint={today.length ? "vencen hoy" : "sin entregas hoy"}
        >
          <TaskListDialogButton title="Tareas para hoy" tasks={today} />
        </StatCard>
        <StatCard
          label="Hechas · 7 dias"
          value={completedWeek}
          icon={CheckCircle2}
          tone={completedWeek ? "positive" : "neutral"}
          hint={`${completedToday} hoy`}
        >
          <TaskListDialogButton title="Tareas finalizadas" tasks={completedTasks} />
        </StatCard>
      </div>

      {/* Contenido principal + panel de widgets */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(26rem,1.1fr)]">
        <div className="flex flex-col gap-6">
          <FocusSection
            title="Vencido"
            tone="danger"
            icon={AlertTriangle}
            tasks={overdue}
            emptyLabel="Nada vencido. Bien ahi."
          />
          <FocusSection
            title="Hoy"
            tone="accent"
            icon={Sun}
            tasks={today}
            emptyLabel="Sin tareas para hoy. Captura algo arriba si surge."
          />
          <FocusSection
            title="Proximos 3 dias"
            icon={CalendarClock}
            tasks={nextThreeDays}
            emptyLabel="Nada entre manana y los proximos 3 dias."
          />
          <FocusSection
            title="Proxima semana"
            icon={CalendarDays}
            tasks={nextWeek}
            emptyLabel="Nada programado entre 4 y 10 dias."
          />
        </div>

        <div className="flex flex-col gap-6">
          <WorkloadHeatmap days={heatmapDays} />
          <PriorityBreakdown counts={prio} total={pendientes} />
          <ProjectBreakdown rows={projectRows} />
        </div>
      </div>
    </div>
  );
}
