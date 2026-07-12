"use client";
// Menu de acciones por tarea: editar, realizar/reabrir, cambiar estado, alternar
// diaria y eliminar (con confirmacion). Muta solo via *Action de lib/db/actions.
import { useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Check,
  RotateCcw,
  Trash2,
  ArrowRightLeft,
  Repeat,
} from "lucide-react";
import type { Task } from "@/types/db";
import {
  completeTaskAction,
  reopenTaskAction,
  setTaskStatusAction,
  deleteTaskAction,
  toggleDailyAction,
} from "@/lib/db/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useRunAction } from "@/components/tareas/use-run-action";
import { MOVABLE_STATUSES, TASK_STATUS_LABEL } from "@/components/tareas/task-constants";

export function TaskActionsMenu({
  task,
  onEdit,
}: {
  task: Task;
  onEdit: (task: Task) => void;
}) {
  const { run } = useRunAction();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const done = task.status === "hecho";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Acciones de la tarea" />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onEdit(task)}>
            <Pencil />
            Editar
          </DropdownMenuItem>

          {done ? (
            <DropdownMenuItem
              onClick={() =>
                run(() => reopenTaskAction(task.id), {
                  success: "Tarea reabierta",
                })
              }
            >
              <RotateCcw />
              Reabrir
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                run(() => completeTaskAction(task.id), {
                  success: "Tarea realizada",
                })
              }
            >
              <Check />
              Realizar
            </DropdownMenuItem>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft />
              Cambiar estado
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {MOVABLE_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  disabled={status === task.status}
                  onClick={() =>
                    run(() => setTaskStatusAction(task.id, status), {
                      success: `Movida a ${TASK_STATUS_LABEL[status]}`,
                    })
                  }
                >
                  {TASK_STATUS_LABEL[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onClick={() =>
              run(() => toggleDailyAction(task.id, !task.is_daily), {
                success: task.is_daily
                  ? "Quitada de diarias"
                  : "Agregada a diarias",
              })
            }
          >
            <Repeat />
            {task.is_daily ? "Quitar de diarias" : "Marcar como diaria"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar esta tarea</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra la tarea y sus subtareas. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                run(() => deleteTaskAction(task.id), {
                  success: "Tarea eliminada",
                  onSuccess: () => setConfirmOpen(false),
                })
              }
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
