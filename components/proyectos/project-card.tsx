// components/proyectos/project-card.tsx
// Tarjeta de proyecto para la galeria. Presentacional (sin estado): recibe el
// proyecto con su conteo y enlaza al detalle. El color del proyecto crea una
// superficie suave en toda la tarjeta y mantiene el conteo como dato secundario.
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/proyectos/project-status-badge";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { DEFAULT_PROJECT_ICON } from "@/components/proyectos/project-icons";
import type { ProjectWithMetrics } from "@/types/db";

export function ProjectCard({
  project,
  maxHighPriority,
}: {
  project: ProjectWithMetrics;
  maxHighPriority: number;
}) {
  const accent = projectColorValue(project.color);
  const icon = project.icon?.trim() || DEFAULT_PROJECT_ICON;
  const count = project.task_count ?? 0;
  const open = project.open_count ?? 0;
  const progress = count ? Math.round((project.done_count / count) * 100) : 0;
  const priorityLoad = Math.round((project.high_priority_count / maxHighPriority) * 100);

  return (
    <Link
      href={`/proyectos/${project.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        className="h-full gap-3 transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-0.5"
        style={{
          backgroundColor: `${accent}1f`,
          borderColor: `${accent}66`,
          boxShadow: `0 1px 0 ${accent}22`,
        }}
      >
        <CardHeader>
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{
                backgroundColor: `${accent}2e`,
                boxShadow: `inset 0 0 0 1.5px ${accent}b3`,
              }}
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

        <CardContent className="mt-auto space-y-3 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Avance</span>
              <span className="font-mono tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-black/25">
              <div
                className="h-full rounded-full"
                style={{ width: `${progress}%`, backgroundColor: accent }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Prioridad alta</span>
              <span className="font-mono tabular-nums text-priority-alta">
                {project.high_priority_count}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-black/25">
              <div
                className="h-full rounded-full bg-priority-alta"
                style={{ width: `${priorityLoad}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-black/10 pt-2.5 text-xs dark:border-white/10">
            <ProjectMetric icon={ListTodo} label="Pendientes" value={open} />
            <ProjectMetric icon={CheckCircle2} label="Hechas" value={project.done_count} />
            <ProjectMetric
              icon={AlertTriangle}
              label="Vencidas"
              value={project.overdue_count}
              alert={project.overdue_count > 0}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectMetric({
  icon: Icon,
  label,
  value,
  alert = false,
}: {
  icon: typeof ListTodo;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3 shrink-0" aria-hidden />
        <span className="truncate text-[10px]">{label}</span>
      </div>
      <span className={alert ? "font-mono text-sm tabular-nums text-priority-alta" : "font-mono text-sm tabular-nums"}>
        {value}
      </span>
    </div>
  );
}

export default ProjectCard;
