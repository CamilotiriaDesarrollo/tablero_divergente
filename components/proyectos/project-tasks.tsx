"use client";
// components/proyectos/project-tasks.tsx
// Tareas del proyecto agrupadas por FASE / MODULO. El dueno crea fases para
// organizar (ej. "Fase 0", "Modulo 1"). Cada fila abre la tarea completa en un
// popup (TaskForm en modo edicion). Se puede agregar tarea (a una fase o suelta),
// crear/renombrar/mover/eliminar fases. Muta via *Action + router.refresh().
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Archive,
  ListPlus,
  Plus,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TaskForm } from "@/components/tareas/task-form";
import { TaskActionsMenu } from "@/components/tareas/task-actions-menu";
import {
  completeTaskAction,
  reopenTaskAction,
  createPhaseAction,
  renamePhaseAction,
  deletePhaseAction,
  reorderPhasesAction,
} from "@/lib/db/actions";
import { PRIORITY_EMOJI, PRIORITY_LABEL } from "@/lib/utils/urgency";
import { CATEGORY_EMOJI, CATEGORY_LABEL } from "@/components/tareas/task-constants";
import { diasRestantesLabel, dueDateTone } from "@/lib/utils/dates";
import type {
  Phase,
  PhaseOption,
  Priority,
  Project,
  Task,
  TaskWithProject,
} from "@/types/db";

type ProjectOption = Pick<Project, "id" | "name" | "color" | "icon" | "status">;

export function ProjectTasks({
  projectId,
  tasks,
  phases,
  projects,
}: {
  projectId: string;
  tasks: TaskWithProject[];
  phases: Phase[];
  projects: ProjectOption[];
}) {
  // Estado del formulario de tarea (crear o editar/ver).
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [createPhaseId, setCreatePhaseId] = useState<string | null>(null);

  // Estado de la gestion de fases.
  const [phaseDialog, setPhaseDialog] = useState<
    { mode: "create" } | { mode: "rename"; phase: Phase } | null
  >(null);
  const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null);

  const phaseOptions: PhaseOption[] = useMemo(
    () => phases.map((p) => ({ id: p.id, name: p.name, position: p.position })),
    [phases],
  );

  const activeTasks = tasks.filter((task) => task.status !== "hecho");
  const completedTasks = tasks.filter((task) => task.status === "hecho");
  const groupByPhase = (source: TaskWithProject[]) => {
    const byPhase = new Map<string, TaskWithProject[]>();
    for (const phase of phases) byPhase.set(phase.id, []);
    for (const task of source) {
      if (task.phase_id && byPhase.has(task.phase_id)) {
        byPhase.get(task.phase_id)!.push(task);
      }
    }
    return byPhase;
  };
  const activeByPhase = groupByPhase(activeTasks);
  const completedByPhase = groupByPhase(completedTasks);
  const activeNoPhase = activeTasks.filter((task) => !task.phase_id);
  const completedNoPhase = completedTasks.filter((task) => !task.phase_id);

  function openNewTask(phaseId: string | null) {
    setEditingTask(null);
    setCreatePhaseId(phaseId);
    setFormOpen(true);
  }

  function openTask(task: TaskWithProject) {
    setEditingTask(task);
    setCreatePhaseId(null);
    setFormOpen(true);
  }

  const hasPhases = phases.length > 0;
  const isEmpty = tasks.length === 0 && !hasPhases;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-lg font-medium">
          Tareas{" "}
          <span className="font-mono text-sm font-normal text-muted-foreground">
            {tasks.length}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPhaseDialog({ mode: "create" })}
          >
            <Layers />
            Agregar fase
          </Button>
          <Button size="sm" onClick={() => openNewTask(null)}>
            <Plus />
            Nueva tarea
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ListPlus className="size-5" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Este proyecto aun no tiene tareas. Crea una fase para organizarlas
            (ej. Fase 0, Modulo 1) o agrega la primera tarea.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPhaseDialog({ mode: "create" })}
            >
              <Layers />
              Crear fase
            </Button>
            <Button size="sm" onClick={() => openNewTask(null)}>
              <Plus />
              Agregar tarea
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Fases, en orden. */}
          {phases.map((phase, index) => (
            <PhaseSection
              key={phase.id}
              phase={phase}
              index={index}
              total={phases.length}
              tasks={activeByPhase.get(phase.id) ?? []}
              onAddTask={() => openNewTask(phase.id)}
              onOpenTask={openTask}
              onRename={() => setPhaseDialog({ mode: "rename", phase })}
              onDelete={() => setPhaseToDelete(phase)}
              allPhaseIds={phases.map((p) => p.id)}
            />
          ))}

          {/* Tareas sin fase. Con fases: seccion aparte solo si hay. Sin fases: lista plana. */}
          {(!hasPhases || activeNoPhase.length > 0) && (
            <div className="space-y-2">
              {hasPhases && (
                <div className="flex items-center justify-between gap-3 px-1">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Sin fase{" "}
                    <span className="font-mono text-xs">{activeNoPhase.length}</span>
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-muted-foreground"
                    onClick={() => openNewTask(null)}
                  >
                    <Plus className="size-4" />
                    Tarea
                  </Button>
                </div>
              )}
              <TaskList tasks={activeNoPhase} onOpenTask={openTask} />
            </div>
          )}

          {completedTasks.length > 0 ? (
            <ArchivedTasks
              phases={phases}
              byPhase={completedByPhase}
              noPhase={completedNoPhase}
              total={completedTasks.length}
              onOpenTask={openTask}
            />
          ) : null}
        </div>
      )}

      {/* Formulario crear/editar/ver tarea (popup). */}
      <TaskForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        projects={projects}
        task={editingTask}
        defaultProjectId={projectId}
        phaseProjectId={projectId}
        phases={phaseOptions}
        defaultPhaseId={createPhaseId}
        defaultStatus="todo"
      />

      {/* Crear / renombrar fase. */}
      <PhaseDialog
        projectId={projectId}
        state={phaseDialog}
        onClose={() => setPhaseDialog(null)}
      />

      {/* Eliminar fase. */}
      <DeletePhaseDialog
        phase={phaseToDelete}
        onClose={() => setPhaseToDelete(null)}
      />
    </section>
  );
}

function ArchivedTasks({
  phases,
  byPhase,
  noPhase,
  total,
  onOpenTask,
}: {
  phases: Phase[];
  byPhase: Map<string, TaskWithProject[]>;
  noPhase: TaskWithProject[];
  total: number;
  onOpenTask: (task: TaskWithProject) => void;
}) {
  const phasesWithCompletedTasks = phases.filter(
    (phase) => (byPhase.get(phase.id)?.length ?? 0) > 0,
  );

  return (
    <details className="group rounded-xl border border-border bg-card/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Archive className="size-4" aria-hidden />
          Finalizadas
          <span className="font-mono text-xs font-normal">{total}</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-5 border-t border-border px-3 py-4">
        {phasesWithCompletedTasks.map((phase) => {
          const phaseTasks = byPhase.get(phase.id) ?? [];
          return (
            <div key={phase.id} className="space-y-2">
              <h3 className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
                <Layers className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{phase.name}</span>
                <span className="font-mono text-xs font-normal">{phaseTasks.length}</span>
              </h3>
              <TaskList tasks={phaseTasks} onOpenTask={onOpenTask} />
            </div>
          );
        })}

        {noPhase.length > 0 ? (
          <div className="space-y-2">
            {phases.length > 0 ? (
              <h3 className="px-1 text-sm font-medium text-muted-foreground">
                Sin fase <span className="font-mono text-xs font-normal">{noPhase.length}</span>
              </h3>
            ) : null}
            <TaskList tasks={noPhase} onOpenTask={onOpenTask} />
          </div>
        ) : null}
      </div>
    </details>
  );
}

function PhaseSection({
  phase,
  index,
  total,
  tasks,
  onAddTask,
  onOpenTask,
  onRename,
  onDelete,
  allPhaseIds,
}: {
  phase: Phase;
  index: number;
  total: number;
  tasks: TaskWithProject[];
  onAddTask: () => void;
  onOpenTask: (task: TaskWithProject) => void;
  onRename: () => void;
  onDelete: () => void;
  allPhaseIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function move(dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= total) return;
    const ids = [...allPhaseIds];
    [ids[index], ids[j]] = [ids[j], ids[index]];
    startTransition(async () => {
      try {
        await reorderPhasesAction(ids);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo reordenar", { description: errorMessage(error) });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Layers className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{phase.name}</span>
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {tasks.length}
          </span>
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-muted-foreground"
            onClick={onAddTask}
          >
            <Plus className="size-4" />
            Tarea
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  aria-label={`Opciones de ${phase.name}`}
                  disabled={pending}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Pencil />
                Renombrar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => move(-1)} disabled={index === 0}>
                <ChevronUp />
                Subir
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => move(1)}
                disabled={index === total - 1}
              >
                <ChevronDown />
                Bajar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 />
                Eliminar fase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {tasks.length === 0 ? (
        <button
          type="button"
          onClick={onAddTask}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border bg-card/30 px-3 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Plus className="size-4" />
          Agregar la primera tarea de esta fase
        </button>
      ) : (
        <TaskList tasks={tasks} onOpenTask={onOpenTask} />
      )}
    </div>
  );
}

function TaskList({
  tasks,
  onOpenTask,
}: {
  tasks: TaskWithProject[];
  onOpenTask: (task: TaskWithProject) => void;
}) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onOpen={() => onOpenTask(task)} />
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  onOpen,
}: {
  task: TaskWithProject;
  onOpen: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const done = task.status === "hecho";
  const categoryEmoji = task.category ? CATEGORY_EMOJI[task.category] : undefined;

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

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded-md py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Ver o editar la tarea"
      >
        <span
          className={cn(
            "block truncate text-sm",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        {categoryEmoji ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {categoryEmoji} {CATEGORY_LABEL[task.category!] ?? task.category}
          </span>
        ) : null}
      </button>

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
          dueDateTone(task.due_at, done),
        )}
      >
        {diasRestantesLabel(task.due_at)}
      </span>

      <TaskActionsMenu task={task} onEdit={() => onOpen()} />
    </li>
  );
}

function PhaseDialog({
  projectId,
  state,
  onClose,
}: {
  projectId: string;
  state: { mode: "create" } | { mode: "rename"; phase: Phase } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const open = state !== null;
  const renaming = state?.mode === "rename";

  // Sincroniza el valor inicial cada vez que se abre (crear vacio, renombrar con
  // el nombre actual).
  useEffect(() => {
    if (state) setName(state.mode === "rename" ? state.phase.name : "");
  }, [state]);

  function submit() {
    const clean = name.trim();
    if (!clean) {
      toast.error("Escribe un nombre para la fase.");
      return;
    }
    startTransition(async () => {
      try {
        if (state?.mode === "rename") {
          await renamePhaseAction(state.phase.id, clean);
          toast.success("Fase renombrada");
        } else {
          await createPhaseAction({ project_id: projectId, name: clean });
          toast.success("Fase creada");
        }
        router.refresh();
        onClose();
      } catch (error) {
        toast.error("No se pudo guardar la fase", {
          description: errorMessage(error),
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{renaming ? "Renombrar fase" : "Nueva fase o modulo"}</DialogTitle>
          <DialogDescription>
            Una fase agrupa tareas dentro del proyecto. Ponle el nombre que
            quieras: Fase 0, Modulo 1, Investigacion...
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="phase-name">Nombre</Label>
            <Input
              id="phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fase 0"
              autoFocus
              maxLength={120}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : renaming ? "Guardar" : "Crear fase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePhaseDialog({
  phase,
  onClose,
}: {
  phase: Phase | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!phase) return;
    startTransition(async () => {
      try {
        await deletePhaseAction(phase.id);
        toast.success("Fase eliminada", {
          description: "Sus tareas quedaron sin fase, no se borraron.",
        });
        router.refresh();
        onClose();
      } catch (error) {
        toast.error("No se pudo eliminar la fase", {
          description: errorMessage(error),
        });
      }
    });
  }

  return (
    <AlertDialog open={phase !== null} onOpenChange={(o) => (!o ? onClose() : null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar esta fase?</AlertDialogTitle>
          <AlertDialogDescription>
            Se elimina {phase?.name}. Sus tareas no se borran: quedan en Sin fase
            dentro de este proyecto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Intenta de nuevo en un momento.";
}

export default ProjectTasks;
