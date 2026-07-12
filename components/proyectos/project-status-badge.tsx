// components/proyectos/project-status-badge.tsx
// Badge de estado del proyecto. Monocromatico a proposito: el color saturado se
// reserva a prioridades (BLUEPRINT seccion 6). El estado se distingue por la
// etiqueta y un punto neutro de distinta intensidad, no por color.
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/types/db";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  activo: "Activo",
  pausado: "En pausa",
  hecho: "Hecho",
  archivado: "Archivado",
};

// Intensidad del punto neutro por estado (sin color saturado).
const DOT_CLASS: Record<ProjectStatus, string> = {
  idea: "bg-muted-foreground/40",
  activo: "bg-foreground",
  pausado: "bg-muted-foreground/60",
  hecho: "bg-muted-foreground/50",
  archivado: "bg-muted-foreground/30",
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", DOT_CLASS[status])}
      />
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  );
}

export default ProjectStatusBadge;
