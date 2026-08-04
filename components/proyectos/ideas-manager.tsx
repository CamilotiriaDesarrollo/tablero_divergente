"use client";
// components/proyectos/ideas-manager.tsx
// Banco de ideas: tarjetas plegadas, con una sola abierta a la vez. En pantalla
// grande van en tres columnas (mas ideas a la vista sin hacer scroll), en tablet
// en dos y en celular en una sola. Como todas las tarjetas cerradas miden igual,
// la rejilla se lee pareja; al abrir una, solo crece su celda.
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IdeaCard } from "@/components/proyectos/idea-card";
import type { IdeaTaskProject } from "@/components/proyectos/idea-to-task-dialog";
import type { Project } from "@/types/db";

/**
 * Quita tildes y pasa a minusculas. Las ideas se dictan, y el transcriptor si
 * escribe las tildes: sin esto, buscar "adopcion" no encuentra "adopción" y
 * parece que el buscador no sirve.
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CO");
}

export function IdeasManager({
  ideas,
  projects,
}: {
  ideas: Project[];
  projects: IdeaTaskProject[];
}) {
  const [query, setQuery] = useState("");
  // Acordeon: una sola idea abierta. Volver a tocarla la cierra.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredIdeas = useMemo(() => {
    // Cada palabra por separado, y todas tienen que aparecer en algun lugar del
    // texto. Asi "video stereolab" encuentra la idea aunque las dos palabras
    // esten a parrafos de distancia, y el orden en que las escribas da igual.
    const palabras = normalizar(query).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return ideas;
    return ideas.filter((idea) => {
      const texto = normalizar(`${idea.name} ${idea.description ?? ""}`);
      return palabras.every((palabra) => texto.includes(palabra));
    });
  }, [ideas, query]);

  return (
    <section className="mt-8" aria-label="Gestion de ideas">
      <div className="mb-4 flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en el titulo y en el desarrollo"
            aria-label="Buscar en el titulo y en el desarrollo de las ideas"
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredIdeas.length} de {ideas.length} ideas
        </p>
      </div>
      {filteredIdeas.length ? (
        // items-start: al abrir una tarjeta crece solo ella, sin estirar a las
        // vecinas de su fila hasta la misma altura.
        // Los cortes tienen que ser breakpoints con NOMBRE. Tailwind ordena las
        // variantes arbitrarias (min-[1200px]) ANTES que sm/xl, asi que a 1240px
        // ganaba sm:grid-cols-2 por ir despues en la hoja y se veian 2 columnas.
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              projects={projects}
              expanded={expandedId === idea.id}
              onToggle={() =>
                setExpandedId((current) => (current === idea.id ? null : idea.id))
              }
            />
          ))}
        </div>
      ) : (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Ninguna idea contiene todo lo que escribiste, ni en el titulo ni en el
          desarrollo.
        </div>
      )}
    </section>
  );
}
