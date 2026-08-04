"use client";
// components/proyectos/idea-to-task-dialog.tsx
// Convierte una idea del banco en una tarea real. Trae el titulo y el desarrollo
// ya escritos, y pide lo que una idea no tiene: proyecto, categoria, prioridad y
// fecha de entrega.
//
// Al guardar, la idea pasa a 'archivado': sale del banco pero NO se borra, asi
// que si la conversion sale mal el texto original sigue en la base. Borrarla es
// una decision aparte, con su propio boton y su confirmacion.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
} from "@/components/tareas/task-constants";
import { createTaskAction, setProjectStatusAction } from "@/lib/db/actions";
import { markLocalMutation } from "@/lib/realtime/echo-guard";
import { toDateColumn } from "@/lib/utils/dates";
import { PRIORITY_EMOJI } from "@/lib/utils/urgency";
import type { Priority, Project } from "@/types/db";

const TITLE_LIMIT = 500;
const NOTES_LIMIT = 5000;
const NO_PROJECT = "__sin-proyecto__";
const NO_CATEGORY = "__sin-categoria__";
const NO_PRIORITY = "sin";

const PRIO_OPTIONS = [
  { value: NO_PRIORITY, label: "Sin prioridad" },
  { value: "alta", label: `${PRIORITY_EMOJI.alta} Alta` },
  { value: "media", label: `${PRIORITY_EMOJI.media} Media` },
  { value: "baja", label: `${PRIORITY_EMOJI.baja} Baja` },
];

export type IdeaTaskProject = Pick<Project, "id" | "name" | "icon">;

export function IdeaToTaskDialog({
  idea,
  projects,
  open,
  onOpenChange,
}: {
  idea: Project;
  projects: IdeaTaskProject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [category, setCategory] = useState(NO_CATEGORY);
  const [prio, setPrio] = useState(NO_PRIORITY);
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(idea.name.slice(0, TITLE_LIMIT));
    // El desarrollo de una idea admite mas texto que las notas de una tarea:
    // se recorta al limite para que el guardado no falle en silencio.
    setNotes((idea.description ?? "").slice(0, NOTES_LIMIT));
    setProjectId(NO_PROJECT);
    setCategory(NO_CATEGORY);
    setPrio(NO_PRIORITY);
    setDueAt(toDateColumn(new Date()));
  }, [open, idea.name, idea.description]);

  const recortada = (idea.description ?? "").length > NOTES_LIMIT;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("La tarea necesita un titulo");
      return;
    }
    startTransition(async () => {
      try {
        markLocalMutation();
        await createTaskAction({
          title: cleanTitle,
          notes: notes.trim() || null,
          status: "todo",
          project_id: projectId === NO_PROJECT ? null : projectId,
          category: category === NO_CATEGORY ? null : category,
          priority: prio === NO_PRIORITY ? null : (prio as Priority),
          received_at: toDateColumn(new Date()),
          due_at: dueAt || null,
        });
        markLocalMutation();
      } catch {
        toast.error("No se pudo crear la tarea", {
          description: "La idea sigue intacta en el banco. Intenta de nuevo.",
        });
        return;
      }

      // La tarea ya existe. Si archivar falla, se avisa pero no se deshace nada:
      // quedarse sin la tarea seria peor que ver la idea repetida en el banco.
      try {
        await setProjectStatusAction(idea.id, "archivado");
        toast.success("Idea convertida en tarea", {
          description: "Sale del banco y la ves en Tareas.",
        });
      } catch {
        toast.warning("La tarea quedo creada", {
          description: "Pero la idea sigue en el banco; puedes eliminarla a mano.",
        });
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
              Convertir en tarea
            </DialogTitle>
            <DialogDescription>
              La idea sale del banco y queda como tarea. El texto original no se
              borra.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="idea-tarea-titulo">Que hay que hacer</Label>
            <Textarea
              id="idea-tarea-titulo"
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, TITLE_LIMIT))}
              rows={2}
              className="min-h-16"
              disabled={pending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="idea-tarea-proyecto">Proyecto</Label>
              <Select
                value={projectId}
                onValueChange={(next) => setProjectId(next as string)}
              >
                <SelectTrigger id="idea-tarea-proyecto" className="w-full">
                  <SelectValue>
                    {(selected: string) => {
                      if (!selected || selected === NO_PROJECT) return "Sin proyecto";
                      const project = projects.find((item) => item.id === selected);
                      return project
                        ? `${project.icon ? `${project.icon} ` : ""}${project.name}`
                        : "Sin proyecto";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>Sin proyecto</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.icon ? `${project.icon} ` : ""}
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="idea-tarea-prioridad">Prioridad</Label>
              <Select value={prio} onValueChange={(next) => setPrio(next as string)}>
                <SelectTrigger id="idea-tarea-prioridad" className="w-full">
                  <SelectValue>
                    {(selected: string) =>
                      PRIO_OPTIONS.find((option) => option.value === selected)?.label ??
                      "Sin prioridad"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="idea-tarea-categoria">Categoria</Label>
              <Select
                value={category}
                onValueChange={(next) => setCategory(next as string)}
              >
                <SelectTrigger id="idea-tarea-categoria" className="w-full">
                  <SelectValue>
                    {(selected: string) =>
                      selected && selected !== NO_CATEGORY
                        ? `${CATEGORY_EMOJI[selected] ? `${CATEGORY_EMOJI[selected]} ` : ""}${CATEGORY_LABEL[selected] ?? selected}`
                        : "Sin categoria"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Sin categoria</SelectItem>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CATEGORY_EMOJI[option] ? `${CATEGORY_EMOJI[option]} ` : ""}
                      {CATEGORY_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="idea-tarea-entrega">Entrega</Label>
              <Input
                id="idea-tarea-entrega"
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="idea-tarea-notas">Detalle</Label>
            <Textarea
              id="idea-tarea-notas"
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, NOTES_LIMIT))}
              rows={5}
              disabled={pending}
            />
            {recortada ? (
              <span className="text-xs text-muted-foreground">
                El desarrollo era mas largo de lo que admite una tarea y se
                recorto. El texto completo queda guardado en la idea.
              </span>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Convirtiendo..." : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default IdeaToTaskDialog;
