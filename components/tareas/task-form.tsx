"use client";
// Formulario de crear/editar/ver una tarea (dialogo controlado). Campos: titulo,
// notas, proyecto (o fase cuando se abre dentro de un proyecto), prioridad, fecha
// recibida, fecha entrega, categoria, recurso (url) y diaria. Muta via
// createTaskAction / updateTaskAction. En modo edicion muestra las subtareas.
// Textos en espanol, sin em-dashes.
import { useEffect, useState } from "react";
import type {
  PhaseOption,
  Project,
  Task,
  TaskStatus,
  Priority,
} from "@/types/db";
import { createTaskAction, updateTaskAction } from "@/lib/db/actions";
import { PRIORITY_EMOJI, PRIORITY_LABEL } from "@/lib/utils/urgency";
import { toDateColumn } from "@/lib/utils/dates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SubtaskList } from "@/components/tareas/subtask-list";
import { useRunAction } from "@/components/tareas/use-run-action";
import {
  NONE_VALUE,
  CATEGORY_OPTIONS,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
} from "@/components/tareas/task-constants";
import { PRIORITIES } from "@/types/db";
import { toast } from "sonner";

type ProjectOption = Pick<Project, "id" | "name" | "color" | "icon" | "status">;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  /** Presente = modo edicion. */
  task?: Task | null;
  /** Estado inicial al crear (por defecto 'todo'). */
  defaultStatus?: TaskStatus;
  defaultProjectId?: string | null;
  /** Proyecto al que pertenecen las fases entregadas al formulario. */
  phaseProjectId?: string | null;
  phases?: PhaseOption[];
  /** Fase preseleccionada al crear (ej. se agrego desde una fase concreta). */
  defaultPhaseId?: string | null;
}

export function TaskForm({
  open,
  onOpenChange,
  projects,
  task,
  defaultStatus = "todo",
  defaultProjectId = null,
  phaseProjectId = null,
  phases,
  defaultPhaseId = null,
}: TaskFormProps) {
  const { run, pending } = useRunAction();
  const editing = Boolean(task);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState<string>(NONE_VALUE);
  const [phaseId, setPhaseId] = useState<string>(NONE_VALUE);
  const [priority, setPriority] = useState<string>(NONE_VALUE);
  const [receivedAt, setReceivedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [category, setCategory] = useState<string>(NONE_VALUE);
  const [resourceUrl, setResourceUrl] = useState("");
  const [isDaily, setIsDaily] = useState(false);

  // Reinicia el formulario cada vez que se abre o cambia la tarea a editar.
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setNotes(task?.notes ?? "");
    setProjectId(task?.project_id ?? defaultProjectId ?? NONE_VALUE);
    setPhaseId(task?.phase_id ?? defaultPhaseId ?? NONE_VALUE);
    setPriority(task ? (task.priority ?? NONE_VALUE) : "media");
    setReceivedAt(task ? (task.received_at ?? "") : toDateColumn(new Date()));
    setDueAt(task?.due_at ?? "");
    setCategory(task?.category ?? NONE_VALUE);
    setResourceUrl(task?.resource_url ?? "");
    setIsDaily(task?.is_daily ?? false);
  }, [open, task, defaultProjectId, defaultPhaseId]);

  const phaseVisible = Boolean(phaseProjectId && projectId === phaseProjectId);

  function handleSubmit() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Escribe un titulo para la tarea.");
      return;
    }

    const payload = {
      title: cleanTitle,
      notes: notes.trim() || null,
      project_id: projectId === NONE_VALUE ? null : projectId,
      // Si se cambia de proyecto desde su detalle, la fase anterior ya no aplica.
      ...(phaseProjectId
        ? { phase_id: phaseVisible && phaseId !== NONE_VALUE ? phaseId : null }
        : {}),
      priority: (priority === NONE_VALUE ? null : priority) as Priority | null,
      received_at: receivedAt || null,
      due_at: dueAt || null,
      category: category === NONE_VALUE ? null : category,
      resource_url: resourceUrl.trim() || null,
      is_daily: isDaily,
    };

    run(
      () =>
        editing && task
          ? updateTaskAction(task.id, payload)
          : createTaskAction({ ...payload, status: defaultStatus }),
      {
        success: editing ? "Tarea actualizada" : "Tarea creada",
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  const phaseOptions = phases ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Ajusta los detalles. El medidor de urgencia se recalcula solo."
              : "Captura una tarea con todos sus detalles. Solo el titulo es obligatorio."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-0.5 py-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Titulo</Label>
            <Textarea
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Actividad especifica"
              rows={2}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-notes">Notas</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto, enlaces, detalles"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Proyecto</Label>
              <Select
                value={projectId}
                onValueChange={(value) => {
                  const nextProjectId = value as string;
                  setProjectId(nextProjectId);
                  if (nextProjectId !== phaseProjectId) setPhaseId(NONE_VALUE);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => {
                      if (!value || value === NONE_VALUE) return "Sin proyecto";
                      const project = projects.find((item) => item.id === value);
                      return project
                        ? `${project.icon ? `${project.icon} ` : ""}${project.name}`
                        : "Sin proyecto";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Sin proyecto</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.icon ? `${project.icon} ` : ""}
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {phaseVisible ? (
              <div className="flex flex-col gap-1.5">
                <Label>Fase o modulo</Label>
                <Select value={phaseId} onValueChange={(v) => setPhaseId(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) => {
                        if (!v || v === NONE_VALUE) return "Sin fase";
                        const p = phaseOptions.find((x) => x.id === v);
                        return p ? p.name : "Sin fase";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Sin fase</SelectItem>
                    {phaseOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label>Prioridad</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as string)}
              >
                <SelectTrigger className="w-full">
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-received">Fecha recibida</Label>
              <Input
                id="task-received"
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due">Fecha de entrega</Label>
              <Input
                id="task-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) =>
                      v && v !== NONE_VALUE
                        ? `${CATEGORY_EMOJI[v] ? `${CATEGORY_EMOJI[v]} ` : ""}${CATEGORY_LABEL[v] ?? v}`
                        : "Sin categoria"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Sin categoria</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_EMOJI[c] ? `${CATEGORY_EMOJI[c]} ` : ""}
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-resource">Recurso (url)</Label>
              <Input
                id="task-resource"
                type="url"
                inputMode="url"
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div className="flex flex-col">
              <Label htmlFor="task-daily" className="cursor-pointer">
                Tarea diaria
              </Label>
              <span className="text-xs text-muted-foreground">
                Aparece en la vista de diarias.
              </span>
            </div>
            <Switch
              id="task-daily"
              checked={isDaily}
              onCheckedChange={(v) => setIsDaily(v)}
            />
          </div>

          {editing && task && (
            <>
              <Separator />
              <SubtaskList parentId={task.id} />
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSubmit} disabled={pending}>
            {editing ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
