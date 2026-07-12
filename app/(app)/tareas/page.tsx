// app/(app)/tareas/page.tsx
// RSC: obtiene los datos iniciales con lib/db y los pasa a la vista cliente.
// NUNCA consulta Supabase directo (CLAUDE.md): todo pasa por lib/db.
import type { Metadata } from "next";
import { getAllBoardTasks, getDailyTasks } from "@/lib/db/tasks";
import { getProjectOptions } from "@/lib/db/projects";
import { TareasView } from "@/components/tareas/tareas-view";

export const metadata: Metadata = { title: "Tareas" };

export default async function TareasPage() {
  const [boardTasks, dailyTasks, projects] = await Promise.all([
    getAllBoardTasks(),
    getDailyTasks(),
    getProjectOptions(),
  ]);

  return (
    <TareasView
      boardTasks={boardTasks}
      dailyTasks={dailyTasks}
      projects={projects}
    />
  );
}
