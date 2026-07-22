"use client";
// components/proyectos/project-form.tsx
// Formulario de proyecto (crear/editar). Client Component: muta SOLO via los
// *Action de lib/db/actions dentro de useTransition; tras exito, router.refresh().
// Campos: nombre, descripcion, estado, color (paleta pequena) e icono (emoji).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createProjectAction,
  updateProjectAction,
} from "@/lib/db/actions";
import {
  PROJECT_COLORS,
  DEFAULT_PROJECT_COLOR,
} from "@/components/proyectos/project-colors";
import {
  PROJECT_ICON_OPTIONS,
  DEFAULT_PROJECT_ICON,
} from "@/components/proyectos/project-icons";
import { PROJECT_STATUS_LABEL } from "@/components/proyectos/project-status-badge";
import type { Project, ProjectStatus } from "@/types/db";
import { PROJECT_STATUSES } from "@/types/db";

// Estados ofrecidos en el formulario. 'archivado' se maneja aparte en el detalle.
const FORM_STATUSES: ProjectStatus[] = PROJECT_STATUSES.filter(
  (s) => s !== "archivado",
);

interface ProjectFormProps {
  mode: "create" | "edit";
  project?: Project;
  onSuccess?: (project: Project) => void;
  onCancel?: () => void;
}

export function ProjectForm({
  mode,
  project,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? "activo",
  );
  const [color, setColor] = useState<string>(
    project?.color ?? DEFAULT_PROJECT_COLOR,
  );
  const [icon, setIcon] = useState<string>(project?.icon ?? DEFAULT_PROJECT_ICON);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Falta el nombre", {
        description: "Escribe un nombre para el proyecto.",
      });
      return;
    }

    const input = {
      name: trimmed,
      description: description.trim() ? description.trim() : null,
      status,
      color,
      icon,
    };

    startTransition(async () => {
      try {
        const saved =
          mode === "create"
            ? await createProjectAction(input)
            : await updateProjectAction(project!.id, input);
        toast.success(
          mode === "create" ? "Proyecto creado" : "Proyecto actualizado",
        );
        router.refresh();
        onSuccess?.(saved);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Intenta de nuevo en un momento.";
        toast.error("No se pudo guardar el proyecto", { description: message });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">Nombre</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre del proyecto"
          autoFocus
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-description">Descripcion</Label>
        <Textarea
          id="project-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="En una linea, de que trata"
          rows={3}
          maxLength={8000}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project-status">Estado</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as ProjectStatus)}
          >
            <SelectTrigger id="project-status" className="w-full">
              <SelectValue>
                {(value) => PROJECT_STATUS_LABEL[value as ProjectStatus]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FORM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {PROJECT_COLORS.map((c) => {
              const selected = c.token === color;
              return (
                <button
                  key={c.token}
                  type="button"
                  onClick={() => setColor(c.token)}
                  aria-label={c.label}
                  aria-pressed={selected}
                  title={c.label}
                  className={cn(
                    "size-6 rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : "hover:scale-110",
                  )}
                  style={{ backgroundColor: c.value }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Icono</Label>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_ICON_OPTIONS.map((emoji) => {
            const selected = emoji === icon;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                aria-label={`Icono ${emoji}`}
                aria-pressed={selected}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  selected
                    ? "bg-accent ring-1 ring-foreground/30"
                    : "hover:bg-muted",
                )}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending
            ? "Guardando..."
            : mode === "create"
              ? "Crear proyecto"
              : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

interface ProjectFormDialogProps {
  mode: "create" | "edit";
  project?: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: Project) => void;
}

/** Dialog listo para usar con el formulario dentro (crear o editar). */
export function ProjectFormDialog({
  mode,
  project,
  open,
  onOpenChange,
  onSuccess,
}: ProjectFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nuevo proyecto" : "Editar proyecto"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Dale un nombre, un color y un icono. Podras cambiarlo cuando quieras."
              : "Ajusta los datos del proyecto."}
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          mode={mode}
          project={project}
          onSuccess={(saved) => {
            onOpenChange(false);
            onSuccess?.(saved);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default ProjectForm;
