// app/(app)/proyectos/[id]/page.tsx
// Detalle de proyecto (RSC). Carga el proyecto y sus tareas con lib/db y los pasa
// a Client Components para las mutaciones. Si el proyecto no existe: notFound().
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/db/projects";
import { getTasksByProject } from "@/lib/db/tasks";
import { ProjectDetailHeader } from "@/components/proyectos/project-detail-header";
import { ProjectTasks } from "@/components/proyectos/project-tasks";

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const tasks = await getTasksByProject(project.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <ProjectDetailHeader project={project} />
      <div className="mt-8">
        <ProjectTasks projectId={project.id} tasks={tasks} />
      </div>
    </main>
  );
}
