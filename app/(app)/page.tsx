// app/(app)/page.tsx
// Inicio: tablero de productividad. Indicadores (pendientes, vencidas, hoy,
// realizadas), actividad de la semana, distribucion por prioridad, trabajo por
// proyecto y listas de foco (vencido / hoy / proximo). La urgencia sugiere, el
// orden lo decide la persona (BLUEPRINT / CLAUDE.md). Sin em-dashes en la copy.
import { subDays, startOfDay, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Sun,
} from "lucide-react";
import { getOpenTasks, getCompletedSince } from "@/lib/db/tasks";
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
  WeeklyActivity,
  PriorityBreakdown,
  ProjectBreakdown,
  FocusSection,
  type DaySlot,
  type ProjectSlot,
} from "@/components/inicio/dashboard";

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
  let failed = false;
  try {
    [openTasks, completed] = await Promise.all([
      getOpenTasks(), // todo + en_progreso, nivel superior, con proyecto
      getCompletedSince(weekStart.toISOString()),
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
  const upcoming = openTasks
    .filter((t) => {
      const d = diasRestantes(t.due_at);
      return d !== null && d > 0 && d <= 14;
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
  const dayOf = (iso: string | null) =>
    iso ? toDateColumn(parseISO(iso)) : "";
  const completedToday = completed.filter(
    (t) => dayOf(t.completed_at) === todayStr,
  ).length;

  const series: DaySlot[] = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(now, 6 - i);
    const key = toDateColumn(d);
    return {
      key,
      label: format(d, "EEEEEE", { locale: es }),
      count: completed.filter((t) => dayOf(t.completed_at) === key).length,
      isToday: key === todayStr,
    };
  });

  // --- Trabajo abierto por proyecto (incluye "Sin proyecto") ---
  const projMap = new Map<string, ProjectSlot>();
  for (const t of openTasks) {
    const id = t.project?.id ?? "__none__";
    const cur =
      projMap.get(id) ??
      ({
        id,
        name: t.project?.name ?? "Sin proyecto",
        icon: t.project?.icon ?? null,
        count: 0,
      } as ProjectSlot);
    cur.count += 1;
    projMap.set(id, cur);
  }
  const projectRows = [...projMap.values()]
    .sort((a, b) => b.count - a.count)
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
    <div className="mx-auto max-w-5xl space-y-6">
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
        />
        <StatCard
          label="Vencidas"
          value={overdue.length}
          icon={AlertTriangle}
          tone={overdue.length ? "danger" : "neutral"}
          hint={overdue.length ? "requieren atencion" : "nada vencido"}
        />
        <StatCard
          label="Para hoy"
          value={today.length}
          icon={Sun}
          tone={today.length ? "accent" : "neutral"}
          hint={today.length ? "vencen hoy" : "sin entregas hoy"}
        />
        <StatCard
          label="Hechas · 7 dias"
          value={completedWeek}
          icon={CheckCircle2}
          tone={completedWeek ? "positive" : "neutral"}
          hint={`${completedToday} hoy`}
        />
      </div>

      {/* Contenido principal + panel de widgets */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
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
            title="Proximo · 14 dias"
            icon={CalendarClock}
            tasks={upcoming}
            emptyLabel="Nada en el horizonte cercano."
          />
        </div>

        <div className="flex flex-col gap-6">
          <WeeklyActivity series={series} total={completedWeek} />
          <PriorityBreakdown counts={prio} total={pendientes} />
          <ProjectBreakdown rows={projectRows} />
        </div>
      </div>
    </div>
  );
}
