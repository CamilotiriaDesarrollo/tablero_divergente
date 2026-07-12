// app/(app)/proyectos/page.tsx
// Galeria + tablero de proyectos "reales" (RSC). Obtiene los datos iniciales con
// lib/db (getProjectsWithCounts) y los pasa al Client Component de la galeria.
// El banco de ideas (status 'idea') vive en /ideas, no aqui.
import { getProjectsWithCounts } from "@/lib/db/projects";
import { ProjectGallery } from "@/components/proyectos/project-gallery";

export const metadata = {
  title: "Proyectos",
};

export default async function ProyectosPage() {
  const projects = await getProjectsWithCounts({
    statuses: ["activo", "pausado", "hecho"],
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8 space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Proyectos
        </h1>
        <p className="text-sm text-muted-foreground">
          Tus proyectos activos, en pausa y terminados. Cada uno guarda sus
          tareas.
        </p>
      </header>

      <ProjectGallery projects={projects} />
    </main>
  );
}
