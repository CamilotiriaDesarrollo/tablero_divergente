"use client";

import { useState } from "react";
import { ListIcon } from "lucide-react";
import { completeTaskAction, reopenTaskAction } from "@/lib/db/actions";
import { TaskDetailDialog } from "@/components/calendario/task-detail-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRunAction } from "@/components/tareas/use-run-action";
import { PRIORITY_EMOJI } from "@/lib/utils/urgency";
import { diasRestantesLabel, dueDateTone } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import type { TaskWithProject } from "@/types/db";
import { projectColorValue } from "@/components/proyectos/project-colors";

function DashboardTaskRow({
  task,
  onOpen,
}: {
  task: TaskWithProject;
  onOpen: (task: TaskWithProject) => void;
}) {
  const { run } = useRunAction();
  const done = task.status === "hecho";

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60">
      <Checkbox
        checked={done}
        onCheckedChange={() =>
          run(
            () =>
              done ? reopenTaskAction(task.id) : completeTaskAction(task.id),
            { success: done ? "Tarea reabierta" : "Tarea realizada" },
          )
        }
        aria-label={done ? "Reabrir tarea" : "Realizar tarea"}
      />
      <span className="w-4 text-center text-sm" aria-hidden>
        {task.priority ? PRIORITY_EMOJI[task.priority] : "."}
      </span>
      <button
        type="button"
        onClick={() => onOpen(task)}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          done && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </button>
      {task.project?.name ? (
        <span
          className="hidden max-w-[8rem] truncate text-xs sm:inline"
          style={{ color: projectColorValue(task.project.color) }}
        >
          {task.project.name}
        </span>
      ) : null}
      <span className={cn("shrink-0 font-mono text-xs tabular-nums", dueDateTone(task.due_at, done))}>
        {diasRestantesLabel(task.due_at)}
      </span>
    </div>
  );
}

export function TaskListDialog({
  title,
  tasks,
  open,
  onOpenChange,
}: {
  title: string;
  tasks: TaskWithProject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<TaskWithProject | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[min(92vw,72rem)] max-w-[72rem]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[72vh] overflow-y-auto rounded-lg border border-border p-2">
            {tasks.length ? (
              tasks.map((task) => (
                <DashboardTaskRow key={task.id} task={task} onOpen={setSelected} />
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No hay tareas en esta lista.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <TaskDetailDialog
        task={selected}
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
      />
    </>
  );
}

export function TaskListPanel({
  title,
  tasks,
  emptyLabel,
  limit = 6,
}: {
  title: string;
  tasks: TaskWithProject[];
  emptyLabel: string;
  limit?: number;
}) {
  const [listOpen, setListOpen] = useState(false);
  const [selected, setSelected] = useState<TaskWithProject | null>(null);
  const shown = tasks.slice(0, limit);
  const rest = tasks.length - shown.length;

  if (!tasks.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col rounded-lg bg-card p-1 ring-1 ring-foreground/10">
        {shown.map((task) => (
          <DashboardTaskRow key={task.id} task={task} onOpen={setSelected} />
        ))}
        {rest > 0 ? (
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="px-2 py-1.5 text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            ver {rest} mas
          </button>
        ) : null}
      </div>
      <TaskListDialog title={title} tasks={tasks} open={listOpen} onOpenChange={setListOpen} />
      <TaskDetailDialog
        task={selected}
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
      />
    </>
  );
}

export function TaskListDialogButton({
  title,
  tasks,
}: {
  title: string;
  tasks: TaskWithProject[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label={`Abrir ${title}`}
        title={`Abrir ${title}`}
      >
        <ListIcon />
      </Button>
      <TaskListDialog title={title} tasks={tasks} open={open} onOpenChange={setOpen} />
    </>
  );
}
