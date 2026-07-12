"use client";
// components/proyectos/project-detail-header.tsx
// Cabecera del detalle de proyecto. Client Component: cambia estado, edita y
// archiva/elimina, todo via los *Action dentro de useTransition + router.refresh().
// El color del proyecto es acento sutil (anillo del icono), nunca relleno.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectFormDialog } from "@/components/proyectos/project-form";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { DEFAULT_PROJECT_ICON } from "@/components/proyectos/project-icons";
import { PROJECT_STATUS_LABEL } from "@/components/proyectos/project-status-badge";
import {
  setProjectStatusAction,
  deleteProjectAction,
} from "@/lib/db/actions";
import type { Project, ProjectStatus } from "@/types/db";

// Estados de ciclo de vida de un proyecto real (idea vive en /ideas).
const LIFECYCLE_STATUSES: ProjectStatus[] = ["activo", "pausado", "hecho"];

export function ProjectDetailHeader({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const accent = projectColorValue(project.color);
  const icon = project.icon?.trim() || DEFAULT_PROJECT_ICON;

  function changeStatus(status: ProjectStatus) {
    if (status === project.status) return;
    startTransition(async () => {
      try {
        await setProjectStatusAction(project.id, status);
        toast.success(`Estado: ${PROJECT_STATUS_LABEL[status]}`);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo cambiar el estado", {
          description: errorMessage(error),
        });
      }
    });
  }

  function archive() {
    startTransition(async () => {
      try {
        await setProjectStatusAction(project.id, "archivado");
        toast.success("Proyecto archivado", {
          description: "Lo encuentras cambiando su estado cuando quieras.",
        });
        router.push("/proyectos");
        router.refresh();
      } catch (error) {
        toast.error("No se pudo archivar", {
          description: errorMessage(error),
        });
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteProjectAction(project.id);
        setDeleteOpen(false);
        toast.success("Proyecto eliminado");
        router.push("/proyectos");
        router.refresh();
      } catch (error) {
        toast.error("No se pudo eliminar", {
          description: errorMessage(error),
        });
      }
    });
  }

  const statusValue = LIFECYCLE_STATUSES.includes(project.status)
    ? project.status
    : "activo";

  return (
    <header className="space-y-4">
      <Link
        href="/proyectos"
        className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-4" />
        Proyectos
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl"
            style={{ boxShadow: `inset 0 0 0 1.5px ${accent}88` }}
          >
            {icon}
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            {project.description?.trim() ? (
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={statusValue}
            onValueChange={(value) => changeStatus(value as ProjectStatus)}
            disabled={pending}
          >
            <SelectTrigger aria-label="Estado del proyecto">
              <SelectValue>
                {(value) => PROJECT_STATUS_LABEL[value as ProjectStatus]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LIFECYCLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            disabled={pending}
          >
            <Pencil />
            Editar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Mas acciones"
                  disabled={pending}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={archive}>
                <Archive />
                Archivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ProjectFormDialog
        mode="edit"
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar este proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra {project.name} de forma permanente. Sus tareas quedan sin
              proyecto asignado. Si solo quieres esconderlo, mejor archivalo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={remove}
              disabled={pending}
            >
              {pending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Intenta de nuevo en un momento.";
}

export default ProjectDetailHeader;
