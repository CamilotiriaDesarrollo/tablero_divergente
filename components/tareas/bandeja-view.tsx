"use client";
// Bandeja (status inbox): captura rapida arriba y clasificacion abajo. Cada item
// se puede asignar a un proyecto, darle prioridad y fecha (updateTaskAction) y
// "mover a tareas" (setTaskStatusAction id 'todo'). Estado vacio que celebra la
// bandeja limpia. Filosofia GTD: capturar sin friccion, clasificar despues.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Trash2 } from "lucide-react";
import type { Project, TaskWithProject, Priority } from "@/types/db";
import { PRIORITIES } from "@/types/db";
import {
  updateTaskAction,
  setTaskStatusAction,
  deleteTaskAction,
} from "@/lib/db/actions";
import { PRIORITY_EMOJI, PRIORITY_LABEL } from "@/lib/utils/urgency";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QuickCapture } from "@/components/tareas/quick-capture";
import { useRunAction } from "@/components/tareas/use-run-action";
import { NONE_VALUE } from "@/components/tareas/task-constants";

type ProjectOption = Pick<Project, "id" | "name" | "color" | "icon" | "status">;

function InboxItem({
  task,
  projects,
  onRemove,
}: {
  task: TaskWithProject;
  projects: ProjectOption[];
  onRemove: (id: string) => void;
}) {
  const { run } = useRunAction();
  const router = useRouter();

  function update(patch: Parameters<typeof updateTaskAction>[1]) {
    run(() => updateTaskAction(task.id, patch), {
      error: "No se pudo clasificar la tarea. Intenta de nuevo.",
    });
  }

  async function moveToTasks() {
    onRemove(task.id);
    try {
      await setTaskStatusAction(task.id, "todo");
      toast.success("Movida a tareas");
      router.refresh();
    } catch {
      toast.error("No se pudo mover la tarea. Intenta de nuevo.");
      router.refresh();
    }
  }

  async function remove() {
    onRemove(task.id);
    try {
      await deleteTaskAction(task.id);
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar la tarea. Intenta de nuevo.");
      router.refresh();
    }
  }

  const projectValue = task.project_id ?? NONE_VALUE;
  const priorityValue = task.priority ?? NONE_VALUE;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-medium leading-snug">{task.title}</p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Eliminar de la bandeja"
          onClick={() => void remove()}
        >
          <Trash2 className="text-muted-foreground" />
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-36 flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Proyecto</Label>
          <Select
            value={projectValue}
            onValueChange={(v) =>
              update({ project_id: v === NONE_VALUE ? null : (v as string) })
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue>
                {(v: string) => {
                  if (!v || v === NONE_VALUE) return "Sin proyecto";
                  const p = projects.find((x) => x.id === v);
                  return p
                    ? `${p.icon ? `${p.icon} ` : ""}${p.name}`
                    : "Sin proyecto";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Sin proyecto</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.icon ? `${p.icon} ` : ""}
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-36 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Prioridad</Label>
          <Select
            value={priorityValue}
            onValueChange={(v) =>
              update({
                priority: (v === NONE_VALUE ? null : v) as Priority | null,
              })
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue>
                {(v: string) =>
                  v && v !== NONE_VALUE
                    ? `${PRIORITY_EMOJI[v as Priority]} ${PRIORITY_LABEL[v as Priority]}`
                    : "Sin prioridad"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Sin prioridad</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_EMOJI[p]} {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-40 flex-col gap-1">
          <Label
            htmlFor={`due-${task.id}`}
            className="text-xs text-muted-foreground"
          >
            Entrega
          </Label>
          <Input
            id={`due-${task.id}`}
            type="date"
            className="h-7"
            defaultValue={task.due_at ?? ""}
            onChange={(e) => update({ due_at: e.target.value || null })}
          />
        </div>

        <Button size="sm" variant="outline" onClick={() => void moveToTasks()}>
          Mover a tareas
          <ArrowRight />
        </Button>
      </div>
    </li>
  );
}

export function BandejaView({
  inboxTasks,
  projects,
}: {
  inboxTasks: TaskWithProject[];
  projects: ProjectOption[];
}) {
  const [items, setItems] = useState<TaskWithProject[]>(inboxTasks);

  useEffect(() => {
    setItems(inboxTasks);
  }, [inboxTasks]);

  function removeItem(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Bandeja
        </h1>
        <p className="text-sm text-muted-foreground">
          Captura ahora, clasifica despues. Todo lo que entra vive aqui hasta que
          tu lo ordenas.
        </p>
      </header>

      <QuickCapture placeholder="Anota lo que tengas en la cabeza y presiona Enter" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-12 text-center">
          <CheckCircle2 className="size-8 text-priority-baja" />
          <p className="text-base font-medium">Bandeja limpia</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            No queda nada por clasificar. Cuando surja algo, captura arriba y
            sigue con lo tuyo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Por clasificar</p>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {items.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((task) => (
              <InboxItem
                key={task.id}
                task={task}
                projects={projects}
                onRemove={removeItem}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
