"use client";
// components/proyectos/project-gallery.tsx
// Galeria + tablero de proyectos "reales" (activo/pausado/hecho). Client Component:
// recibe los proyectos ya cargados por el RSC y gestiona el dialog de "Nuevo
// proyecto". No consulta datos directo; la creacion pasa por el *Action del form.
import { useState } from "react";
import { FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/proyectos/project-card";
import { ProjectFormDialog } from "@/components/proyectos/project-form";
import type { ProjectWithCount } from "@/types/db";

export function ProjectGallery({ projects }: { projects: ProjectWithCount[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  if (projects.length === 0) {
    return (
      <>
        <EmptyState onCreate={() => setCreateOpen(true)} />
        <ProjectFormDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="font-mono text-xs text-muted-foreground">
          {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Nuevo proyecto
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <ProjectFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FolderPlus className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-medium">
          Aun no tienes proyectos
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Crea el primero para empezar a organizar tus tareas por proyecto.
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus />
        Crear proyecto
      </Button>
    </div>
  );
}

export default ProjectGallery;
