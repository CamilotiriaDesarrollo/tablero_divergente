"use client";
// components/proyectos/idea-card.tsx
// Una idea del banco, plegada por defecto. Misma organizacion que el planeador
// de Marketing: fila compacta de alto fijo, se abre una a la vez y solo la
// abierta muestra el desarrollo completo y las acciones. En una sola columna el
// banco se lee como una lista, que es como se revisa: de arriba a abajo.
//
// La barra de color es el color de la idea; sirve para reconocerla de un vistazo
// cuando ya hay muchas.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, ChevronRight, Lightbulb, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  IdeaToTaskDialog,
  type IdeaTaskProject,
} from "@/components/proyectos/idea-to-task-dialog";
import { projectColorValue } from "@/components/proyectos/project-colors";
import { deleteProjectAction, updateProjectAction } from "@/lib/db/actions";
import { cn } from "@/lib/utils";
import { formatFecha } from "@/lib/utils/dates";
import type { Project } from "@/types/db";

const NOTE_LIMIT = 8000;

export function IdeaCard({
  idea,
  projects,
  expanded,
  onToggle,
}: {
  idea: Project;
  projects: IdeaTaskProject[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(idea.name);
  const [description, setDescription] = useState(idea.description ?? "");

  const accent = projectColorValue(idea.color);
  const emoji = idea.icon?.trim() || null;
  const capturada = formatFecha(idea.created_at, "d MMM");
  const desarrollo = idea.description?.trim() ?? "";

  function saveIdea(event: React.FormEvent) {
    event.preventDefault();
    const title = name.trim();
    if (!title) {
      toast.error("Escribe un titulo para la idea.");
      return;
    }
    startTransition(async () => {
      try {
        await updateProjectAction(idea.id, {
          name: title,
          description: description.trim() || null,
        });
        toast.success("Idea actualizada");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo actualizar la idea", {
          description: error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteProjectAction(idea.id);
        toast.success("Idea eliminada");
        setDeleteOpen(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo eliminar la idea", {
          description: error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  return (
    <>
      <article
        className={cn(
          "relative overflow-hidden rounded-lg bg-card ring-1 transition-shadow",
          expanded ? "shadow-sm ring-foreground/20" : "ring-foreground/10",
        )}
      >
        <span
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: `${accent}0d` }}
          aria-hidden
        />
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: accent }}
          aria-hidden
        />

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="relative flex w-full items-start gap-2.5 py-2.5 pl-3 pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight
            aria-hidden
            className={cn(
              "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-90",
            )}
          />
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-sm"
            style={{ boxShadow: `inset 0 0 0 1.5px ${accent}88` }}
          >
            {emoji ?? (
              <Lightbulb className="size-4" style={{ color: accent }} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            {/* Alto fijo de dos lineas: todas las filas cerradas miden igual. */}
            <span className="line-clamp-2 min-h-10 break-words text-sm font-medium leading-snug">
              {idea.name}
            </span>
            <span className="mt-0.5 flex h-4 items-center gap-x-2 overflow-hidden text-[11px] leading-4 text-muted-foreground">
              {capturada ? (
                <span className="shrink-0">capturada el {capturada}</span>
              ) : null}
              <span className="truncate">
                {desarrollo
                  ? `${desarrollo.length.toLocaleString("es-CO")} caracteres`
                  : "sin desarrollo"}
              </span>
            </span>
          </span>
        </button>

        {expanded ? (
          <div className="relative space-y-3 border-t px-3 py-3 pl-4">
            {desarrollo ? (
              // break-words: las ideas dictadas suelen traer URLs largas sin
              // espacios, que sin esto empujan la fila fuera de la pantalla.
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {desarrollo}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/70">
                Sin desarrollo todavia. Abre Desarrollar para trabajarla.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
              >
                <Pencil />
                Desarrollar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setTaskOpen(true)}
              >
                <ArrowUpRight />
                Convertir en tarea
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Eliminar idea"
                title="Eliminar idea"
                className="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ) : null}
      </article>

      <IdeaToTaskDialog
        idea={idea}
        projects={projects}
        open={taskOpen}
        onOpenChange={setTaskOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar idea</DialogTitle>
            <DialogDescription>
              Se elimina &quot;{idea.name}&quot; y todo su desarrollo. Esta accion
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Desarrollar idea</DialogTitle>
            <DialogDescription>
              Conserva el contexto y promovela cuando este lista.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveIdea} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`idea-name-${idea.id}`}>Titulo</Label>
              <Input
                id={`idea-name-${idea.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`idea-description-${idea.id}`}>Desarrollo</Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {description.length.toLocaleString("es-CO")} / {NOTE_LIMIT.toLocaleString("es-CO")}
                </span>
              </div>
              <Textarea
                id={`idea-description-${idea.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value.slice(0, NOTE_LIMIT))}
                placeholder="Angulo, audiencia, estructura, referencias, datos y siguientes pasos..."
                rows={12}
                maxLength={NOTE_LIMIT}
                className="resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default IdeaCard;
