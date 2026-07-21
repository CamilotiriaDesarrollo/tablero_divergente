// app/(app)/proyectos/[id]/page.tsx
// Detalle de proyecto (RSC). Carga el proyecto, sus fases, sus tareas y la lista
// de proyectos (para mover una tarea a otro), y los pasa a Client Components para
// las mutaciones. Si el proyecto no existe: notFound().
import { notFound } from "next/navigation";
import { getProjectById, getProjectOptions } from "@/lib/db/projects";
import { getTasksByProject } from "@/lib/db/tasks";
import { getPhasesByProject } from "@/lib/db/phases";
import { ProjectDetailHeader } from "@/components/proyectos/project-detail-header";
import { ProjectTasks } from "@/components/proyectos/project-tasks";

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Una sola etapa paralela: las 3 dependientes solo necesitan el id del URL
  // (getProjectById filtra por ese mismo id, asi que project.id === id).
  // Valida notFound() despues; TS estrecha project a no-null por el retorno never.
  const [project, tasks, phases, projects] = await Promise.all([
    getProjectById(id),
    getTasksByProject(id),
    getPhasesByProject(id),
    getProjectOptions(),
  ]);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <ProjectDetailHeader project={project} />
      <div className="mt-8">
        <ProjectTasks
          projectId={project.id}
          tasks={tasks}
          phases={phases}
          projects={projects}
        />
      </div>
    </main>
  );
}
