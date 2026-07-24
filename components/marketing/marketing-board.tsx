"use client";
// components/marketing/marketing-board.tsx
// Tablero de Marketing: pestanas superiores Avatares/Canales. Dentro de
// Avatares, 3 columnas: selector vertical de avatar, perfil + ficha completa,
// y espacio de trabajo (captura de ideas + tarjetas). En movil se apila todo
// verticalmente y el selector pasa a fila horizontal con scroll.
import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarProfileCard } from "@/components/marketing/avatar-profile-card";
import { PersonaDocument } from "@/components/marketing/persona-document";
import { ContentIdeaCard } from "@/components/marketing/content-idea-card";
import { ContentIdeaQuickCapture } from "@/components/marketing/content-idea-quick-capture";
import { AvatarInsightsPanel } from "@/components/marketing/avatar-insights-panel";
import { projectColorValue } from "@/components/proyectos/project-colors";
import type { MarketingAvatarWithIdeas } from "@/types/db";

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

function AvatarSelect({
  avatars,
  active,
  onSelect,
}: {
  avatars: MarketingAvatarWithIdeas[];
  active: MarketingAvatarWithIdeas;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Seleccionar avatar" className="grid grid-cols-4 gap-2">
      {avatars.map((avatar) => {
        const accent = projectColorValue(avatar.color);
        const isActive = avatar.id === active.id;
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            aria-current={isActive ? "true" : undefined}
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-lg p-1.5 text-center outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar
              className="size-12 border-2 transition-transform group-hover:scale-105"
              style={{ borderColor: isActive ? accent : "transparent" }}
            >
              {avatar.photo_url ? (
                <AvatarImage src={avatar.photo_url} alt={avatar.name} />
              ) : null}
              <AvatarFallback
                className="font-semibold"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                {avatar.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span
              className="max-w-full truncate text-[11px] leading-tight"
              style={{ color: isActive ? accent : undefined }}
            >
              {avatar.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function MarketingBoard({
  avatars,
}: {
  avatars: MarketingAvatarWithIdeas[];
}) {
  const [activeId, setActiveId] = useState(avatars[0]?.id);
  const active = avatars.find((a) => a.id === activeId) ?? avatars[0];

  if (!active) return null;

  return (
    <Tabs defaultValue="avatares" className="gap-5">
      <TabsList className="h-9 w-fit">
        <TabsTrigger value="avatares">Avatares</TabsTrigger>
        <TabsTrigger value="canales">Canales</TabsTrigger>
      </TabsList>

      <TabsContent value="avatares">
        <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <aside className="flex min-w-0 flex-col gap-4">
            <AvatarSelect
              avatars={avatars}
              active={active}
              onSelect={setActiveId}
            />
            <AvatarProfileCard avatar={active} />
            <PersonaDocument avatar={active} />
          </aside>

          <section className="min-w-0 space-y-4">
            <AvatarInsightsPanel
              avatarId={active.id}
              observations={active.observations}
            />
            <ContentIdeaQuickCapture avatarId={active.id} avatarName={active.name} />
            {active.ideas.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {active.ideas.map((idea) => (
                  <ContentIdeaCard key={idea.id} idea={idea} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
                {`Sin ideas de contenido para ${active.name} todavia. Captura la primera arriba.`}
              </div>
            )}
          </section>
        </div>
      </TabsContent>

      <TabsContent value="canales">
        <ChannelsPlaceholder />
      </TabsContent>
    </Tabs>
  );
}

export default MarketingBoard;
