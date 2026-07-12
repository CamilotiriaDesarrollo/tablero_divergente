"use client";
// components/proyectos/project-tasks.tsx
// Lista de tareas del proyecto en el detalle. Presentacion simple: prioridad con
// PRIORITY_EMOJI y dias restantes con diasRestantesLabel. Permite agregar una
// tarea (con project_id) y marcar realizada. Muta via *Action + router.refresh().
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, ListPlus, Plus } from "lucide-react";
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
  createTaskAction,
  completeTaskAction,
  reopenTaskAction,
} from "@/lib/db/actions";
import { PRIORITY_EMOJI, PRIORITY_LABEL } from "@/lib/utils/urgency";
import { diasRestantesLabel, estaVencida } from "@/lib/utils/dates";
import type { Priority, TaskWithProject } from "@/types/db";

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "ninguna", label: "Sin prioridad" },
  { value: "alta", label: `${PRIORITY_EMOJI.alta} Alta` },
  { value: "media", label: `${PRIORITY_EMOJI.media} Media` },
  { value: "baja", label: `${PRIORITY_EMOJI.baja} Baja` },
];
const PRIORITY_OPTION_LABEL: Record<string, string> = Object.fromEntries(
  PRIORITY_OPTIONS.map((o) => [o.value, o.label]),
);

export function ProjectTasks({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskWithProject[];
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-lg font-medium">
          Tareas{" "}
          <span className="font-mono text-sm font-normal text-muted-foreground">
            {tasks.length}
          </span>
        </h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          Agregar tarea
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ListPlus className="size-5" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Este proyecto aun no tiene tareas. Agrega la primera para empezar.
          </p>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus />
            Agregar tarea
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}

      <AddTaskDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </section>
  );
}

function TaskRow({ task }: { task: TaskWithProject }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const done = task.status === "hecho";
  const overdue = !done && estaVencida(task.due_at);

  function toggle() {
    startTransition(async () => {
      try {
        if (done) {
          await reopenTaskAction(task.id);
          toast.success("Tarea reabierta");
        } else {
          await completeTaskAction(task.id);
          toast.success("Tarea realizada");
        }
        router.refresh();
      } catch (error) {
        toast.error("No se pudo actualizar la tarea", {
          description: errorMessage(error),
        });
      }
    });
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={done ? "Reabrir tarea" : "Marcar como realizada"}
        aria-pressed={done}
        className="shrink-0 rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {done ? (
          <CheckCircle2 className="size-5 text-foreground" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
      </div>

      {task.priority ? (
        <span
          className="shrink-0 text-sm"
          title={`Prioridad ${PRIORITY_LABEL[task.priority as Priority]}`}
        >
          {PRIORITY_EMOJI[task.priority as Priority]}
        </span>
      ) : null}

      <span
        className={cn(
          "shrink-0 font-mono text-xs tabular-nums",
          overdue ? "text-priority-alta" : "text-muted-foreground",
        )}
      >
        {diasRestantesLabel(task.due_at)}
      </span>
    </li>
  );
}

function AddTaskDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<string>("ninguna");
  const [dueAt, setDueAt] = useState("");

  function reset() {
    setTitle("");
    setNotes("");
    setPriority("ninguna");
    setDueAt("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Falta el titulo", {
        description: "Escribe que hay que hacer.",
      });
      return;
    }

    startTransition(async () => {
      try {
        await createTaskAction({
          title: trimmed,
          project_id: projectId,
          status: "todo",
          priority: priority === "ninguna" ? null : (priority as Priority),
          due_at: dueAt ? dueAt : null,
          notes: notes.trim() ? notes.trim() : null,
        });
        toast.success("Tarea agregada");
        router.refresh();
        reset();
        onOpenChange(false);
      } catch (error) {
        toast.error("No se pudo agregar la tarea", {
          description: errorMessage(error),
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar tarea</DialogTitle>
          <DialogDescription>
            Se crea dentro de este proyecto. La prioridad y la fecha son
            opcionales.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Que hay que hacer</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Actividad especifica"
              autoFocus
              required
              maxLength={500}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as string)}>
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue>
                    {(value) => PRIORITY_OPTION_LABEL[value as string]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due">Fecha de entrega</Label>
              <Input
                id="task-due"
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-notes">Notas</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Detalles, enlaces, contexto"
              rows={3}
              maxLength={5000}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Agregando..." : "Agregar tarea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Intenta de nuevo en un momento.";
}

export default ProjectTasks;
