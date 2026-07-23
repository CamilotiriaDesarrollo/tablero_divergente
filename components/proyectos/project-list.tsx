"use client";
// components/proyectos/project-list.tsx
// Vista de LISTA de proyectos (alternativa a la cuadricula): una fila por
// proyecto con sus indicadores como columnas, para comparar de un vistazo.
// Mismos datos que ProjectCard (ProjectWithMetrics), presentacion tabular.
// Encabezados ordenables: clic alterna ascendente/descendente (patron WAI-ARIA
// sortable table, aria-sort en el th). Orden por defecto = position (sin ordenar).
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectStatusBadge } from "@/components/proyectos/project-status-badge";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { DEFAULT_PROJECT_ICON } from "@/components/proyectos/project-icons";
import { cn } from "@/lib/utils";
import type { ProjectStatus, ProjectWithMetrics } from "@/types/db";

type SortKey =
  | "name"
  | "status"
  | "progress"
  | "open"
  | "done"
  | "overdue"
  | "high_priority";
type SortDir = "asc" | "desc";

// Orden logico del ciclo de vida (no alfabetico): activo antes que pausado antes
// que hecho.
const STATUS_ORDER: Record<ProjectStatus, number> = {
  idea: 0,
  activo: 1,
  pausado: 2,
  hecho: 3,
  archivado: 4,
};

const COLUMNS: {
  key: SortKey;
  label: string;
  align: "left" | "right";
  defaultDir: SortDir;
}[] = [
  { key: "name", label: "Proyecto", align: "left", defaultDir: "asc" },
  { key: "status", label: "Estado", align: "left", defaultDir: "asc" },
  { key: "progress", label: "Avance", align: "right", defaultDir: "desc" },
  { key: "open", label: "Pendientes", align: "right", defaultDir: "desc" },
  { key: "done", label: "Hechas", align: "right", defaultDir: "desc" },
  { key: "overdue", label: "Vencidas", align: "right", defaultDir: "desc" },
  {
    key: "high_priority",
    label: "Prioridad alta",
    align: "right",
    defaultDir: "desc",
  },
];

function progressOf(project: ProjectWithMetrics): number {
  const count = project.task_count ?? 0;
  return count ? Math.round((project.done_count / count) * 100) : 0;
}

function sortValue(project: ProjectWithMetrics, key: SortKey): number | string {
  switch (key) {
    case "name":
      return project.name.toLocaleLowerCase("es");
    case "status":
      return STATUS_ORDER[project.status];
    case "progress":
      return progressOf(project);
    case "open":
      return project.open_count ?? 0;
    case "done":
      return project.done_count;
    case "overdue":
      return project.overdue_count;
    case "high_priority":
      return project.high_priority_count;
  }
}

export function ProjectList({ projects }: { projects: ProjectWithMetrics[] }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey, defaultDir: SortDir) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(defaultDir);
      return;
    }
    setSortDir((current) => (current === "asc" ? "desc" : "asc"));
  }

  const sorted = useMemo(() => {
    if (!sortKey) return projects;
    const factor = sortDir === "asc" ? 1 : -1;
    return [...projects].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (typeof va === "string" || typeof vb === "string") {
        return factor * String(va).localeCompare(String(vb), "es");
      }
      return factor * (va - vb);
    });
  }, [projects, sortKey, sortDir]);

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((column, index) => (
              <SortableHead
                key={column.key}
                column={column}
                active={sortKey === column.key}
                dir={sortKey === column.key ? sortDir : column.defaultDir}
                onSort={() => toggleSort(column.key, column.defaultDir)}
                className={cn(
                  index === 0 && "pl-4",
                  index === COLUMNS.length - 1 && "pr-4",
                  column.align === "right" && "text-right",
                )}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((project) => {
            const accent = projectColorValue(project.color);
            const icon = project.icon?.trim() || DEFAULT_PROJECT_ICON;
            const open = project.open_count ?? 0;
            const progress = progressOf(project);

            return (
              <TableRow key={project.id} className="relative cursor-pointer">
                <TableCell className="pl-4 whitespace-normal">
                  <Link
                    href={`/proyectos/${project.id}`}
                    className="flex min-w-0 items-center gap-2.5 rounded-md outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base"
                      style={{
                        backgroundColor: `${accent}2e`,
                        boxShadow: `inset 0 0 0 1.5px ${accent}b3`,
                      }}
                    >
                      {icon}
                    </span>
                    <span className="min-w-0 truncate font-medium">
                      {project.name}
                    </span>
                  </Link>
                </TableCell>

                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="w-16 overflow-hidden rounded-full bg-black/10 dark:bg-black/25">
                      <span
                        className="block h-1.5 rounded-full"
                        style={{ width: `${progress}%`, backgroundColor: accent }}
                      />
                    </span>
                    <span className="w-9 font-mono text-xs tabular-nums text-muted-foreground">
                      {progress}%
                    </span>
                  </div>
                </TableCell>

                <TableCell className="text-right font-mono tabular-nums">
                  {open}
                </TableCell>

                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {project.done_count}
                </TableCell>

                <TableCell
                  className={cn(
                    "text-right font-mono tabular-nums",
                    project.overdue_count > 0
                      ? "text-priority-alta"
                      : "text-muted-foreground",
                  )}
                >
                  {project.overdue_count > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="size-3" aria-hidden />
                      {project.overdue_count}
                    </span>
                  ) : (
                    project.overdue_count
                  )}
                </TableCell>

                <TableCell className="pr-4 text-right font-mono tabular-nums text-priority-alta">
                  {project.high_priority_count}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SortableHead({
  column,
  active,
  dir,
  onSort,
  className,
}: {
  column: (typeof COLUMNS)[number];
  active: boolean;
  dir: SortDir;
  onSort: () => void;
  className?: string;
}) {
  return (
    <TableHead
      scope="col"
      className={className}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          column.align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {column.label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}

export default ProjectList;
