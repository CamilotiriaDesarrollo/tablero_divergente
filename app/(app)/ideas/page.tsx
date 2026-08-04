// app/(app)/ideas/page.tsx
// Banco de ideas (RSC) = proyectos con status 'idea'. Captura rapida arriba y
// cada idea con "Promover a activo" (sin perder datos). Es una vista de proyectos,
// no una tabla aparte (BLUEPRINT seccion 4).
//
// La captura es el MISMO boton redondo de Inicio: una idea se anota igual desde
// donde sea, y quien ya aprendio a dictarla en Inicio no vuelve a aprender aqui.
import { Lightbulb } from "lucide-react";
import { getIdeas, getProjectOptions } from "@/lib/db/projects";
import { IdeaCaptureButton } from "@/components/shared/quick-capture-buttons";
import { IdeasManager } from "@/components/proyectos/ideas-manager";

export const metadata = {
  title: "Banco de ideas",
};

export default async function IdeasPage() {
  // Los proyectos activos alimentan el dialogo de "Convertir en tarea".
  const [ideas, projects] = await Promise.all([
    getIdeas(),
    getProjectOptions({ statuses: ["activo"] }),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Banco de ideas
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Captura, desarrolla y organiza ideas de contenido. Cuando una este
            lista, promovela a proyecto activo sin perder su contexto.
          </p>
        </div>
        <div className="shrink-0">
          <IdeaCaptureButton />
        </div>
      </header>

      {ideas.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lightbulb className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-medium">
              El banco esta vacio
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Anota tu primera idea arriba. No tiene que estar completa, solo lo
              suficiente para no olvidarla.
            </p>
          </div>
        </div>
      ) : (
        <IdeasManager ideas={ideas} projects={projects} />
      )}
    </main>
  );
}
