// components/proyectos/project-card.tsx
// Tarjeta de proyecto para la galeria. Presentacional (sin estado): recibe el
// proyecto con su conteo y enlaza al detalle. El color del proyecto aparece solo
// como anillo sutil del icono (acento, no relleno). El conteo va en mono (dato).
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/proyectos/project-status-badge";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { DEFAULT_PROJECT_ICON } from "@/components/proyectos/project-icons";
import type { ProjectWithCount } from "@/types/db";

export function ProjectCard({ project }: { project: ProjectWithCount }) {
  const accent = projectColorValue(project.color);
  const icon = project.icon?.trim() || DEFAULT_PROJECT_ICON;
  const count = project.task_count ?? 0;

  return (
    <Link
      href={`/proyectos/${project.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full gap-3 transition-colors group-hover:bg-muted/40">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg"
              // Anillo de color como acento sutil (no relleno). ~55% de alpha.
              style={{ boxShadow: `inset 0 0 0 1.5px ${accent}88` }}
            >
              {icon}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <h3 className="truncate font-heading text-base font-medium leading-snug">
                {project.name}
              </h3>
              <ProjectStatusBadge status={project.status} />
            </div>
          </div>
        </CardHeader>

        {project.description?.trim() ? (
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          </CardContent>
        ) : null}

        <CardContent className="mt-auto">
          <span className="font-mono text-xs text-muted-foreground">
            {count} {count === 1 ? "tarea" : "tareas"}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default ProjectCard;
