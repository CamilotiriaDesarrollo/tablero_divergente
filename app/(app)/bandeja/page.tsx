// app/(app)/bandeja/page.tsx
// RSC: bandeja = tareas con status 'inbox'. Obtiene los datos con lib/db y los
// pasa a la vista cliente (captura rapida + clasificacion).
import type { Metadata } from "next";
import { getInboxTasks } from "@/lib/db/tasks";
import { getProjectOptions } from "@/lib/db/projects";
import { BandejaView } from "@/components/tareas/bandeja-view";

export const metadata: Metadata = { title: "Bandeja" };

export default async function BandejaPage() {
  const [inboxTasks, projects] = await Promise.all([
    getInboxTasks(),
    getProjectOptions(),
  ]);

  return <BandejaView inboxTasks={inboxTasks} projects={projects} />;
}
