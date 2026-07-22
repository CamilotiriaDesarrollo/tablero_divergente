"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IdeaCard } from "@/components/proyectos/idea-card";
import type { Project } from "@/types/db";

export function IdeasManager({ ideas }: { ideas: Project[] }) {
  const [query, setQuery] = useState("");
  const filteredIdeas = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es-CO");
    return ideas.filter((idea) => {
      const content = `${idea.name} ${idea.description ?? ""}`;
      return !term || content.toLocaleLowerCase("es-CO").includes(term);
    });
  }, [ideas, query]);

  return (
    <section className="mt-8" aria-label="Gestion de ideas">
      <div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por idea o nota"
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredIdeas.length} de {ideas.length} ideas
        </p>
      </div>
      {filteredIdeas.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      ) : (
        <div className="py-14 text-center text-sm text-muted-foreground">
          No hay ideas que coincidan con esta busqueda.
        </div>
      )}
    </section>
  );
}
