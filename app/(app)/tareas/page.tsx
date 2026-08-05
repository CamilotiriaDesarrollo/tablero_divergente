// app/(app)/tareas/page.tsx
// RSC: obtiene los datos iniciales con lib/db y los pasa a la vista cliente.
// NUNCA consulta Supabase directo (CLAUDE.md): todo pasa por lib/db.
import type { Metadata } from "next";
import { getAllBoardTasks, getDailyTasks, getWeeklyCompletions } from "@/lib/db/tasks";
import { getProjectOptions } from "@/lib/db/projects";
import { TareasView } from "@/components/tareas/tareas-view";
import { buildWorkloadDays } from "@/lib/utils/workload";
import { toDateColumn } from "@/lib/utils/dates";
import { getWeekDays } from "@/lib/utils/week-range";

export const metadata: Metadata = { title: "Tareas" };

export default async function TareasPage() {
  // Primer pintado del panel semanal: la semana en curso segun el reloj del
  // servidor. WeeklySessionsBoard recalcula "hoy" en el cliente al montar (evita
  // desajustes de hidratacion) y vuelve a pedir la semana si el usuario navega;
  // esto solo evita una pantalla vacia mientras eso pasa.
  const thisWeek = getWeekDays(new Date());

  const [boardTasks, dailyTasks, projects, weeklyCompletions] = await Promise.all([
    getAllBoardTasks(),
    getDailyTasks(),
    getProjectOptions(),
    getWeeklyCompletions(toDateColumn(thisWeek[0]), toDateColumn(thisWeek[6])),
  ]);

  // El mismo mapa de saturacion de Inicio, calculado con el mismo helper: solo
  // cuentan las tareas abiertas, porque una entrega ya hecha no satura nada.
  const workloadDays = buildWorkloadDays(
    boardTasks.filter((task) => task.status !== "hecho"),
  );

  return (
    <TareasView
      boardTasks={boardTasks}
      dailyTasks={dailyTasks}
      projects={projects}
      workloadDays={workloadDays}
      weeklyCompletions={weeklyCompletions}
    />
  );
}
