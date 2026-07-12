"use client";
// components/calendario/task-detail-dialog.tsx
// Detalle de una tarea del calendario: titulo, proyecto, prioridad y dias
// restantes, mas la accion de completar (o reabrir si ya esta hecha). La lectura
// de urgencia sugiere, nunca reordena. Muta via las Server Actions del contrato.
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2Icon, RotateCcwIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { completeTaskAction, reopenTaskAction } from "@/lib/db/actions";
import { diasRestantesLabel, formatFecha } from "@/lib/utils/dates";
import { PRIORITY_EMOJI, PRIORITY_LABEL, urgencySignal } from "@/lib/utils/urgency";
import type { Priority, TaskWithProject } from "@/types/db";

const DOT_CLASS: Record<Priority, string> = {
  alta: "bg-priority-alta",
  media: "bg-priority-media",
  baja: "bg-priority-baja",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: TaskWithProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const done = task.status === "hecho";
  const signal = urgencySignal({
    priority: task.priority,
    dueAt: task.due_at,
    done,
  });

  function runComplete() {
    if (!task) return;
    const id = task.id;
    startTransition(async () => {
      try {
        await completeTaskAction(id);
        toast.success("Tarea completada");
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("No se pudo completar la tarea. Intenta de nuevo.");
      }
    });
  }

  function runReopen() {
    if (!task) return;
    const id = task.id;
    startTransition(async () => {
      try {
        await reopenTaskAction(id);
        toast.success("Tarea reabierta");
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("No se pudo reabrir la tarea. Intenta de nuevo.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={cn(done && "text-muted-foreground line-through")}>
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="divide-y divide-border">
          <Row label="Proyecto">
            {task.project ? (
              <span className="inline-flex items-center gap-1.5">
                {task.project.icon ? <span aria-hidden>{task.project.icon}</span> : null}
                {task.project.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Sin proyecto</span>
            )}
          </Row>

          <Row label="Prioridad">
            {task.priority ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn("size-2 rounded-full", DOT_CLASS[task.priority])}
                  aria-hidden
                />
                {PRIORITY_EMOJI[task.priority]} {PRIORITY_LABEL[task.priority]}
              </span>
            ) : (
              <span className="text-muted-foreground">Sin prioridad</span>
            )}
          </Row>

          <Row label="Entrega">
            {task.due_at ? (
              <span className="inline-flex items-center gap-2">
                <span>{formatFecha(task.due_at, "d 'de' LLLL")}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {diasRestantesLabel(task.due_at)}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Sin fecha</span>
            )}
          </Row>

          <Row label="Estado">
            {done ? (
              <span className="text-muted-foreground">Realizada</span>
            ) : (
              <span>{signal.reason}</span>
            )}
          </Row>
        </div>

        <div className="flex justify-end">
          {done ? (
            <Button variant="outline" onClick={runReopen} disabled={isPending}>
              <RotateCcwIcon />
              {isPending ? "Reabriendo..." : "Reabrir"}
            </Button>
          ) : (
            <Button onClick={runComplete} disabled={isPending}>
              <CheckCircle2Icon />
              {isPending ? "Completando..." : "Completar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
