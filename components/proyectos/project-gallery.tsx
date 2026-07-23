"use client";
// components/proyectos/project-gallery.tsx
// Galeria + tablero de proyectos "reales" (activo/pausado/hecho). Client Component:
// recibe los proyectos ya cargados por el RSC y gestiona el dialog de "Nuevo
// proyecto". No consulta datos directo; la creacion pasa por el *Action del form.
// Dos vistas del mismo dato: Cuadricula (tarjetas) y Lista (tabla comparativa).
// La preferencia se recuerda en localStorage.
import { useEffect, useState } from "react";
import { FolderPlus, LayoutGrid, Plus, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCard } from "@/components/proyectos/project-card";
import { ProjectList } from "@/components/proyectos/project-list";
import { ProjectFormDialog } from "@/components/proyectos/project-form";
import type { ProjectWithMetrics } from "@/types/db";

type ViewMode = "cuadricula" | "lista";
const VIEW_STORAGE_KEY = "tablero-divergente:proyectos-vista";

export function ProjectGallery({ projects }: { projects: ProjectWithMetrics[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("lista");

  // Recuerda la vista elegida entre visitas (leido tras montar: evita
  // desajuste de hidratacion entre server y cliente).
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "cuadricula" || saved === "lista") setView(saved);
  }, []);

  function changeView(next: ViewMode) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

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

  const maxHighPriority = Math.max(1, ...projects.map((item) => item.high_priority_count));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted-foreground">
          {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
        </p>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => changeView(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="cuadricula" aria-label="Ver en cuadricula">
                <LayoutGrid />
                Cuadricula
              </TabsTrigger>
              <TabsTrigger value="lista" aria-label="Ver en lista">
                <Rows3 />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Nuevo proyecto
          </Button>
        </div>
      </div>

      {view === "cuadricula" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              maxHighPriority={maxHighPriority}
            />
          ))}
        </div>
      ) : (
        <ProjectList projects={projects} />
      )}

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
