"use client";
// components/marketing/marketing-board.tsx
// Tablero de Marketing: pestanas superiores Avatares/Canales. Dentro de
// Avatares, 3 columnas: selector vertical de avatar, perfil + ficha completa,
// y espacio de trabajo (captura de ideas + tarjetas). En movil se apila todo
// verticalmente y el selector pasa a fila horizontal con scroll.
import { useMemo, useState } from "react";
import { Megaphone, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarProfileCard } from "@/components/marketing/avatar-profile-card";
import { PersonaDocument } from "@/components/marketing/persona-document";
import { ContentIdeaCard } from "@/components/marketing/content-idea-card";
import { ContentIdeaQuickCapture } from "@/components/marketing/content-idea-quick-capture";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { cn } from "@/lib/utils";
import type { MarketingAvatarWithIdeas } from "@/types/db";

function AvatarSelector({
  avatars,
  activeId,
  onSelect,
}: {
  avatars: MarketingAvatarWithIdeas[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Seleccionar avatar"
      className="flex gap-2 overflow-x-auto pb-1 md:w-40 md:shrink-0 md:flex-col md:overflow-visible md:pb-0"
    >
      {avatars.map((avatar) => {
        const accent = projectColorValue(avatar.color);
        const isActive = avatar.id === activeId;
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors md:w-full",
              isActive
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Avatar size="sm">
              {avatar.photo_url ? (
                <AvatarImage src={avatar.photo_url} alt={avatar.name} />
              ) : null}
              <AvatarFallback
                className="text-[10px] font-semibold"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                {avatar.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {avatar.name}
          </button>
        );
      })}
    </nav>
  );
}

function ChannelsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Megaphone className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-medium">
          Canales todavia no esta definido
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta seccion se construye con la siguiente definicion. Por ahora
          queda la pestana lista para cuando la desarrollemos.
        </p>
      </div>
    </div>
  );
}

export function MarketingBoard({
  avatars,
}: {
  avatars: MarketingAvatarWithIdeas[];
}) {
  const [activeId, setActiveId] = useState(avatars[0]?.id);
  const [query, setQuery] = useState("");
  const active = avatars.find((a) => a.id === activeId) ?? avatars[0];

  const term = query.trim().toLocaleLowerCase("es-CO");
  const filteredIdeas = useMemo(() => {
    if (!active) return [];
    return active.ideas.filter((idea) => {
      const content = `${idea.title} ${idea.notes ?? ""} ${idea.format ?? ""}`;
      return !term || content.toLocaleLowerCase("es-CO").includes(term);
    });
  }, [active, term]);

  if (!active) return null;

  return (
    <Tabs defaultValue="avatares" className="gap-5">
      <TabsList className="h-9 w-fit">
        <TabsTrigger value="avatares">Avatares</TabsTrigger>
        <TabsTrigger value="canales">Canales</TabsTrigger>
      </TabsList>

      <TabsContent value="avatares">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <AvatarSelector
            avatars={avatars}
            activeId={active.id}
            onSelect={setActiveId}
          />

          <div className="flex flex-col gap-4 md:w-72 md:shrink-0 lg:w-80">
            <AvatarProfileCard avatar={active} />
            <PersonaDocument avatar={active} />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar idea de contenido"
                className="pl-9"
              />
            </div>
            <ContentIdeaQuickCapture avatarId={active.id} avatarName={active.name} />
            {filteredIdeas.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredIdeas.map((idea) => (
                  <ContentIdeaCard key={idea.id} idea={idea} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
                {term
                  ? "No hay ideas que coincidan con esta busqueda."
                  : `Sin ideas de contenido para ${active.name} todavia. Captura la primera arriba.`}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="canales">
        <ChannelsPlaceholder />
      </TabsContent>
    </Tabs>
  );
}

export default MarketingBoard;
