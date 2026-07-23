"use client";
// components/marketing/marketing-board.tsx
// Tablero de Marketing: una pestana por avatar (Mateo, Diana, Juan, Laura).
// Cada pestana muestra el perfil del avatar, la captura rapida de ideas de
// contenido y la lista de ideas. Los datos llegan del Server Component por props.
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarProfileCard } from "@/components/marketing/avatar-profile-card";
import { ContentIdeaCard } from "@/components/marketing/content-idea-card";
import { ContentIdeaQuickCapture } from "@/components/marketing/content-idea-quick-capture";
import { projectColorValue } from "@/components/proyectos/project-colors";
import type { MarketingAvatarWithIdeas } from "@/types/db";

export function MarketingBoard({
  avatars,
}: {
  avatars: MarketingAvatarWithIdeas[];
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLocaleLowerCase("es-CO");

  const filtered = useMemo(
    () =>
      avatars.map((avatar) => ({
        ...avatar,
        ideas: avatar.ideas.filter((idea) => {
          const content = `${idea.title} ${idea.notes ?? ""} ${idea.format ?? ""}`;
          return !term || content.toLocaleLowerCase("es-CO").includes(term);
        }),
      })),
    [avatars, term],
  );

  return (
    <Tabs defaultValue={avatars[0]?.id} className="gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="h-10 w-full max-w-xl">
          {avatars.map((avatar) => {
            const accent = projectColorValue(avatar.color);
            return (
              <TabsTrigger key={avatar.id} value={avatar.id}>
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
              </TabsTrigger>
            );
          })}
        </TabsList>
        <div className="relative w-full sm:max-w-xs">
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
      </div>

      {filtered.map((avatar) => (
        <TabsContent key={avatar.id} value={avatar.id} className="space-y-4">
          <AvatarProfileCard avatar={avatar} />
          <ContentIdeaQuickCapture avatarId={avatar.id} avatarName={avatar.name} />
          {avatar.ideas.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {avatar.ideas.map((idea) => (
                <ContentIdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
              {term
                ? "No hay ideas que coincidan con esta busqueda."
                : `Sin ideas de contenido para ${avatar.name} todavia. Captura la primera arriba.`}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default MarketingBoard;
