// components/proyectos/idea-card.tsx
// Tarjeta de una idea (proyecto con status 'idea'). Presentacional: muestra la
// idea y su boton "Promover a activo". El color es acento sutil (anillo del icono).
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PromoteIdeaButton } from "@/components/proyectos/promote-idea-button";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { formatFecha } from "@/lib/utils/dates";
import type { Project } from "@/types/db";

export function IdeaCard({ idea }: { idea: Project }) {
  const accent = projectColorValue(idea.color);
  const icon = idea.icon?.trim() || "💡";
  const capturada = formatFecha(idea.created_at, "d MMM");

  return (
    <Card className="h-full gap-3">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg"
            style={{ boxShadow: `inset 0 0 0 1.5px ${accent}88` }}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-medium leading-snug">
              {idea.name}
            </h3>
            {capturada ? (
              <p className="font-mono text-xs text-muted-foreground">
                capturada el {capturada}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>

      {idea.description?.trim() ? (
        <CardContent>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {idea.description}
          </p>
        </CardContent>
      ) : null}

      <CardContent className="mt-auto">
        <PromoteIdeaButton ideaId={idea.id} />
      </CardContent>
    </Card>
  );
}

export default IdeaCard;
