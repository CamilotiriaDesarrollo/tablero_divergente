"use client";
// Lista de subtareas (micro-tareas via parent_task_id). Carga bajo demanda,
// permite agregar (createSubtaskAction) y completar/reabrir cada subtarea. Maneja
// estado local para respuesta inmediata; las mutaciones pasan por lib/db/actions.
import { useEffect, useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import type { Task } from "@/types/db";
import {
  createSubtaskAction,
  completeTaskAction,
  reopenTaskAction,
  deleteTaskAction,
} from "@/lib/db/actions";
import { getSubtasksAction } from "@/app/(app)/tareas/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SubtaskList({ parentId }: { parentId: string }) {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSubtasksAction(parentId)
      .then((data) => {
        if (active) setSubtasks(data);
      })
      .catch(() => {
        if (active)
          toast.error("No se pudieron cargar las subtareas. Intenta de nuevo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [parentId]);

  async function addSubtask() {
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const created = await createSubtaskAction(parentId, value);
      setSubtasks((prev) => [...prev, created]);
      setTitle("");
      inputRef.current?.focus();
    } catch {
      toast.error("No se pudo agregar la subtarea. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSubtask(sub: Task) {
    const done = sub.status === "hecho";
    // Optimista: refleja el cambio antes de confirmar en el servidor.
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === sub.id
          ? { ...s, status: done ? "todo" : "hecho" }
          : s,
      ),
    );
    try {
      const updated = done
        ? await reopenTaskAction(sub.id)
        : await completeTaskAction(sub.id);
      setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
    } catch {
      // Revertir si falla.
      setSubtasks((prev) =>
        prev.map((s) => (s.id === sub.id ? sub : s)),
      );
      toast.error("No se pudo actualizar la subtarea. Intenta de nuevo.");
    }
  }

  async function removeSubtask(sub: Task) {
    const snapshot = subtasks;
    setSubtasks((prev) => prev.filter((s) => s.id !== sub.id));
    try {
      await deleteTaskAction(sub.id);
    } catch {
      setSubtasks(snapshot);
      toast.error("No se pudo eliminar la subtarea. Intenta de nuevo.");
    }
  }

  const doneCount = subtasks.filter((s) => s.status === "hecho").length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Subtareas</span>
        {subtasks.length > 0 && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {doneCount}/{subtasks.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando subtareas
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {subtasks.map((sub) => {
            const done = sub.status === "hecho";
            return (
              <li
                key={sub.id}
                className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
              >
                <Checkbox
                  checked={done}
                  onCheckedChange={() => toggleSubtask(sub)}
                  aria-label={done ? "Reabrir subtarea" : "Completar subtarea"}
                />
                <span
                  className={cn(
                    "flex-1 text-sm",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {sub.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Eliminar subtarea"
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => removeSubtask(sub)}
                >
                  <span aria-hidden className="text-muted-foreground">
                    &times;
                  </span>
                </Button>
              </li>
            );
          })}
          {subtasks.length === 0 && (
            <li className="py-1 text-sm text-muted-foreground">
              Divide la tarea en pasos pequenos.
            </li>
          )}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addSubtask();
            }
          }}
          placeholder="Agregar una subtarea"
          aria-label="Nueva subtarea"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void addSubtask()}
          disabled={busy || title.trim().length === 0}
        >
          <Plus />
          Agregar
        </Button>
      </div>
    </div>
  );
}
