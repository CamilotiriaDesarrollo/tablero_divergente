// app/(app)/ideas/page.tsx
// Banco de ideas (RSC) = proyectos con status 'idea'. Captura rapida arriba y
// cada idea con "Promover a activo" (sin perder datos). Es una vista de proyectos,
// no una tabla aparte (BLUEPRINT seccion 4).
import { Lightbulb } from "lucide-react";
import { getIdeas } from "@/lib/db/projects";
import { IdeaQuickCapture } from "@/components/proyectos/idea-quick-capture";
import { IdeasManager } from "@/components/proyectos/ideas-manager";

export const metadata = {
  title: "Banco de ideas",
};

export default async function IdeasPage() {
  const ideas = await getIdeas();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-6 space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Banco de ideas
        </h1>
        <p className="text-sm text-muted-foreground">
          Captura, desarrolla y organiza ideas de contenido. Cuando una este
          lista, promovela a proyecto activo sin perder su contexto.
        </p>
      </header>

      <IdeaQuickCapture />

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
        <IdeasManager ideas={ideas} />
      )}
    </main>
  );
}
